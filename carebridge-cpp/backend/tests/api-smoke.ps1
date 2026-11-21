$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$exe = Join-Path $repo 'backend\build\ninja-ucrt\backend\carebridge-api.exe'
$msys = 'C:\msys64\ucrt64\bin'
$env:PATH = "$msys;$env:PATH"
$keyBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($keyBytes) } finally { $rng.Dispose() }
$env:CAREBRIDGE_PROVISION_KEY = [Convert]::ToBase64String($keyBytes)
$env:CAREBRIDGE_PORT = '18123'
$base = 'http://127.0.0.1:18123'
$work = Join-Path $repo 'backend\build\api-smoke'
New-Item -ItemType Directory -Force $work | Out-Null
$db = Join-Path $work 'store.json'
Remove-Item -LiteralPath $db -Force -ErrorAction SilentlyContinue
$server = $null
function Start-Api {
  $script:server = Start-Process -FilePath $exe -ArgumentList $db -WorkingDirectory $repo -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $work 'server.log') -RedirectStandardError (Join-Path $work 'server-error.log')
  for ($i=0; $i -lt 40; $i++) {
    try { Invoke-RestMethod "$base/health" -TimeoutSec 1 | Out-Null; return } catch { Start-Sleep -Milliseconds 250 }
  }
  throw 'Test server did not start.'
}
function Stop-Api { if ($script:server -and !$script:server.HasExited) { Stop-Process -Id $script:server.Id -Force; $script:server.WaitForExit() } }
function PostJson($path,$obj,$headers=@{}) { Invoke-RestMethod -Method Post -Uri "$base$path" -Headers $headers -ContentType 'application/json' -Body ($obj | ConvertTo-Json -Depth 8) }
function GetStatus($method,$uri,$headers=@{},$body='') {
  try { if ($body) { $r=Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType 'application/json' -Body $body -UseBasicParsing } else { $r=Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -UseBasicParsing }; return [int]$r.StatusCode }
  catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }; throw }
}
function Assert($condition,$message) { if (!$condition) { throw "ASSERTION FAILED: $message" } }
try {
  Start-Api
  try { Invoke-RestMethod "$base/auth/me" | Out-Null; throw 'Unauthenticated route was allowed' } catch { Assert ($_.Exception.Response.StatusCode.value__ -eq 401) 'missing token must return 401' }
  $suffix = [guid]::NewGuid().ToString('N')
  $passwordBytes = New-Object byte[] 32
  $passwordRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $passwordRng.GetBytes($passwordBytes) } finally { $passwordRng.Dispose() }
  $testPassword = [Convert]::ToBase64String($passwordBytes)
  $patient = PostJson '/auth/register' @{email="patient-$suffix@test.invalid";password=$testPassword;full_name='Synthetic Patient'}
  $doctor = PostJson '/auth/register/doctor' @{email="doctor-$suffix@test.invalid";password=$testPassword;full_name='Synthetic Doctor';specialty='General Practice';registration_number="SYN-$suffix"}
  $tech = PostJson '/auth/register/lab-technician' @{email="tech-$suffix@test.invalid";password=$testPassword;full_name='Synthetic Technician';department='haematology';provision_key=$env:CAREBRIDGE_PROVISION_KEY}
  $otherTech = PostJson '/auth/register/lab-technician' @{email="other-$suffix@test.invalid";password=$testPassword;full_name='Unassigned Technician';department='haematology';provision_key=$env:CAREBRIDGE_PROVISION_KEY}
  $pLogin = PostJson '/auth/login' @{email="patient-$suffix@test.invalid";password=$testPassword}
  $dLogin = PostJson '/auth/login' @{email="doctor-$suffix@test.invalid";password=$testPassword}
  $tLogin = PostJson '/auth/login' @{email="tech-$suffix@test.invalid";password=$testPassword}
  $oLogin = PostJson '/auth/login' @{email="other-$suffix@test.invalid";password=$testPassword}
  $ph = @{Authorization="Bearer $($pLogin.access_token)"}; $dh = @{Authorization="Bearer $($dLogin.access_token)"}; $th = @{Authorization="Bearer $($tLogin.access_token)"}; $oh = @{Authorization="Bearer $($oLogin.access_token)"}
  Assert ((Invoke-RestMethod "$base/auth/me" -Headers $th).role -eq 'lab_technician') 'technician login role'
  $profile = Invoke-RestMethod "$base/patients/me" -Headers $ph
  $preConsent = GetStatus 'POST' "$base/doctors/me/patients/$($profile.id)/lab-orders" $dh (@{test_name='CBC';technician_id=$tech.id;department='haematology'} | ConvertTo-Json)
  Assert ($preConsent -eq 403) 'lab request denied without patient consent'
  Invoke-RestMethod -Method Post -Uri "$base/patients/me/consents" -Headers $ph -ContentType 'application/json' -Body (@{doctor_id=$doctor.id;scope='medical_history'}|ConvertTo-Json) | Out-Null
  $catalog = Invoke-RestMethod "$base/symptoms/catalog?limit=500"
  $symptom = PostJson '/patients/me/symptoms/structured' @{symptom_ids=@('sym-headache');duration='2 days';severity='mild';notes='Synthetic test note'} $ph
  Assert ($catalog.Count -ge 3 -and $symptom.patient_id -eq $profile.id) 'symptom catalog and submission'
  $appointment = PostJson '/patients/me/appointments' @{doctor_id=$doctor.id;scheduled_at='2030-02-03T10:00:00Z';reason='Synthetic visit'} $ph
  Assert ($appointment.status -eq 'booked') 'appointment creation'
  Invoke-RestMethod -Method Patch -Uri "$base/doctors/me/appointments/$($appointment.id)" -Headers $dh -ContentType 'application/json' -Body '{"status":"approved"}' | Out-Null
  $record = PostJson "/doctors/me/patients/$($profile.id)/records" @{record_type='note';title='Synthetic note';content='Synthetic clinical record.'} $dh
  Assert ((Invoke-RestMethod "$base/patients/me/clinical-records" -Headers $ph).Count -eq 1) 'patient record ownership and list'
  $prescription = PostJson "/doctors/me/patients/$($profile.id)/prescriptions" @{filename='synthetic.pdf';content_type='application/pdf';file_base64='U3ludGhldGlj'} $dh
  $download = Invoke-RestMethod "$base/patients/me/prescriptions/$($prescription.id)/download" -Headers $ph
  Assert ($download.file_base64 -eq 'U3ludGhldGlj') 'prescription download'
  $order = PostJson "/doctors/me/patients/$($profile.id)/lab-orders" @{test_name='CBC';technician_id=$tech.id;department='haematology'} $dh
  $denied = GetStatus 'GET' "$base/lab/me/orders/$($order.id)" $oh
  Assert ($denied -eq 403) 'unassigned technician detail access denied'
  $unassignedPost = GetStatus 'POST' "$base/lab/me/orders/$($order.id)/results" $oh '{"results":[]}'
  Assert ($unassignedPost -eq 403) 'unassigned technician result submission denied'
  $detail = Invoke-RestMethod "$base/lab/me/orders/$($order.id)" -Headers $th
  Assert ($detail.patient_name -eq 'Synthetic Patient' -and $detail.status -eq 'Assigned') 'assigned technician sees task-scoped detail'
  try { Invoke-RestMethod "$base/doctors/me/patients" -Headers $th | Out-Null; throw 'Technician accessed doctor patient list' } catch { Assert ($_.Exception.Response.StatusCode.value__ -eq 403) 'technician denied unrelated clinician route' }
  try { Invoke-RestMethod "$base/patients/me/clinical-records" -Headers $th | Out-Null; throw 'Technician accessed unrelated clinical notes' } catch { Assert ($_.Exception.Response.StatusCode.value__ -eq 403) 'technician denied unrelated clinical notes' }
  Invoke-RestMethod -Method Post -Uri "$base/lab/me/orders/$($order.id)/start" -Headers $th | Out-Null
  $result = PostJson "/lab/me/orders/$($order.id)/results" @{results=@(@{test_name='Haemoglobin';value=13.2;unit='g/dL'},@{test_name='WBC';value=6200;unit='cells/uL'},@{test_name='Platelets';value=250000;unit='cells/uL'})} $th
  Assert ($result.status -eq 'Completed') 'authorized result submission'
  Assert ((Invoke-RestMethod "$base/patients/me/lab-results" -Headers $ph).Count -eq 3) 'patient sees own result'
  Assert ((Invoke-RestMethod "$base/doctors/me/lab-results?patient_id=$($profile.id)" -Headers $dh).Count -eq 3) 'ordering doctor sees result'
  PostJson '/patients/me/vitals' @{heart_rate=170;oxygen_saturation=99;systolic_bp=$null;diastolic_bp=$null;temperature_c=$null;weight_kg=$null;notes='Synthetic'} $ph | Out-Null
  Assert ((Invoke-RestMethod "$base/patients/me/alerts" -Headers $ph).Count -eq 1) 'threshold alert generated'
  Assert ((Invoke-RestMethod "$base/patients/me/vitals" -Headers $ph).Count -eq 1) 'patient reads own vitals'
  Assert ((Invoke-RestMethod "$base/patients/me/timeline" -Headers $ph).Count -ge 6) 'timeline includes clinical, prescription, laboratory and vital events'
  $consents = Invoke-RestMethod "$base/patients/me/consents" -Headers $ph
  $historyConsent = @($consents | Where-Object { $_.scope -eq 'medical_history' })[0]
  $revokePath = '/patients/me/consents/' + $historyConsent.id + '/revoke'
  PostJson $revokePath @{} $ph | Out-Null
  $revokedRead = GetStatus 'GET' "$base/doctors/me/lab-results?patient_id=$($profile.id)" $dh
  Assert ($revokedRead -eq 403) 'doctor result read denied after consent revocation'
  Write-Host 'API authentication, patient, doctor, consent, prescription, lab assignment, denial, results, vitals and alert checks passed.'
  Stop-Api
  Start-Api
  $relogin = PostJson '/auth/login' @{email="patient-$suffix@test.invalid";password=$testPassword}
  $persisted = Invoke-RestMethod "$base/patients/me/lab-results" -Headers @{Authorization="Bearer $($relogin.access_token)"}
  Assert ($persisted.Count -eq 3) 'stored patient results survive server restart'
  Stop-Api
  $savedStore = Get-Content -Raw $db | ConvertFrom-Json
  Assert (@($savedStore.audit | Where-Object { $_.action -eq 'lab_result.submit' -and $_.success }).Count -eq 1) 'authorized lab submission audited'
  Assert (@($savedStore.audit | Where-Object { $_.action -eq 'lab_order.access' -and !$_.success }).Count -ge 1) 'denied unassigned lab access audited'
  Write-Host 'Persistence across server restart passed.'
} finally { Stop-Api }
