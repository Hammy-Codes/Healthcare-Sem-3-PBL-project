
import re

import models
from database import get_db


# Initial catalog. We will expand this toward 300–500 entries.
# Each entry: (stable ID, display name, category, everyday-language aliases)
SYMPTOMS = [
    # General
    ("fatigue", "Fatigue", "General", ["tiredness", "low energy", "feeling exhausted"]),
    ("fever", "Fever", "General", ["high temperature", "feeling feverish"]),
    ("chills", "Chills", "General", ["shivering", "feeling cold"]),
    ("weakness", "Weakness", "General", ["feeling weak", "lack of strength"]),
    ("unexplained-weight-loss", "Unexplained weight loss", "General", ["losing weight without trying"]),
    ("unexplained-weight-gain", "Unexplained weight gain", "General", ["gaining weight unexpectedly"]),
    ("excessive-sweating", "Excessive sweating", "General", ["sweating a lot", "heavy sweating"]),
    ("night-sweats", "Night sweats", "General", ["sweating during sleep"]),
    ("reduced-appetite", "Reduced appetite", "General", ["not feeling hungry", "loss of appetite"]),
    ("increased-appetite", "Increased appetite", "General", ["always hungry", "feeling hungry often"]),

    # Head, brain and nerves
    ("headache", "Headache", "Head and nerves", ["head pain", "pain in my head"]),
    ("migraine-like-headache", "Migraine-like headache", "Head and nerves", ["throbbing headache", "severe one-sided headache"]),
    ("dizziness", "Dizziness", "Head and nerves", ["feeling dizzy", "lightheadedness"]),
    ("spinning-sensation", "Spinning sensation", "Head and nerves", ["vertigo", "room spinning"]),
    ("fainting", "Fainting", "Head and nerves", ["passing out", "blackout"]),
    ("difficulty-concentrating", "Difficulty concentrating", "Head and nerves", ["poor concentration", "can't focus"]),
    ("memory-difficulty", "Memory difficulty", "Head and nerves", ["forgetfulness", "memory problems"]),
    ("tremor", "Tremor", "Head and nerves", ["shaky hands", "involuntary shaking"]),
    ("numbness", "Numbness", "Head and nerves", ["loss of feeling", "body part feels numb"]),
    ("tingling", "Tingling", "Head and nerves", ["pins and needles", "prickling sensation"]),

    # Eyes and vision
    ("blurred-vision", "Blurred vision", "Eyes", ["blurry eyesight", "vision is blurry"]),
    ("eye-pain", "Eye pain", "Eyes", ["pain in the eye", "sore eyes"]),
    ("red-eyes", "Red eyes", "Eyes", ["bloodshot eyes", "eye redness"]),
    ("itchy-eyes", "Itchy eyes", "Eyes", ["eyes itching", "irritated eyes"]),
    ("watery-eyes", "Watery eyes", "Eyes", ["tearing eyes", "eyes watering"]),
    ("dry-eyes", "Dry eyes", "Eyes", ["gritty eyes", "eyes feel dry"]),
    ("light-sensitivity", "Sensitivity to light", "Eyes", ["light hurts my eyes", "photophobia"]),
    ("double-vision", "Double vision", "Eyes", ["seeing double"]),
    ("eye-discharge", "Eye discharge", "Eyes", ["sticky eyes", "eye mucus"]),
    ("reduced-vision", "Reduced vision", "Eyes", ["difficulty seeing", "loss of vision"]),

    # Ear, nose and throat
    ("ear-pain", "Ear pain", "Ear, nose and throat", ["earache", "pain inside ear"]),
    ("hearing-difficulty", "Difficulty hearing", "Ear, nose and throat", ["muffled hearing", "reduced hearing"]),
    ("ringing-ears", "Ringing in the ears", "Ear, nose and throat", ["tinnitus", "buzzing in ears"]),
    ("blocked-nose", "Blocked nose", "Ear, nose and throat", ["stuffy nose", "nasal congestion"]),
    ("runny-nose", "Runny nose", "Ear, nose and throat", ["nose dripping", "nasal discharge"]),
    ("sneezing", "Sneezing", "Ear, nose and throat", ["frequent sneezing"]),
    ("sore-throat", "Sore throat", "Ear, nose and throat", ["throat pain", "pain when swallowing"]),
    ("hoarse-voice", "Hoarse voice", "Ear, nose and throat", ["voice becoming rough", "lost voice"]),
    ("difficulty-swallowing", "Difficulty swallowing", "Ear, nose and throat", ["food getting stuck", "trouble swallowing"]),
    ("mouth-ulcers", "Mouth ulcers", "Ear, nose and throat", ["mouth sores", "painful mouth spots"]),

    # Respiratory
    ("cough", "Cough", "Respiratory", ["coughing", "persistent cough"]),
    ("dry-cough", "Dry cough", "Respiratory", ["cough without mucus", "tickly cough"]),
    ("productive-cough", "Cough with mucus", "Respiratory", ["wet cough", "coughing up phlegm"]),
    ("shortness-of-breath", "Shortness of breath", "Respiratory", ["breathlessness", "difficulty breathing"]),
    ("wheezing", "Wheezing", "Respiratory", ["whistling while breathing"]),
    ("chest-tightness", "Chest tightness", "Respiratory", ["tight chest", "chest feels restricted"]),
    ("painful-breathing", "Pain when breathing", "Respiratory", ["pain on deep breath"]),
    ("excessive-phlegm", "Excess phlegm", "Respiratory", ["too much mucus", "mucus in throat"]),

    # Heart and circulation
    ("chest-pain", "Chest pain", "Heart and circulation", ["pain in chest", "chest discomfort"]),
    ("palpitations", "Heart palpitations", "Heart and circulation", ["racing heart", "pounding heartbeat"]),
    ("rapid-heartbeat", "Rapid heartbeat", "Heart and circulation", ["fast pulse", "heart beating fast"]),
    ("slow-heartbeat", "Slow heartbeat", "Heart and circulation", ["unusually slow pulse"]),
    ("leg-swelling", "Leg swelling", "Heart and circulation", ["swollen legs", "fluid in legs"]),
    ("ankle-swelling", "Ankle swelling", "Heart and circulation", ["swollen ankles"]),
    ("cold-hands-feet", "Cold hands or feet", "Heart and circulation", ["hands always cold", "feet always cold"]),

    # Digestive
    ("abdominal-pain", "Abdominal pain", "Digestive", ["stomach pain", "belly ache"]),
    ("upper-abdominal-pain", "Upper abdominal pain", "Digestive", ["pain above the belly button"]),
    ("lower-abdominal-pain", "Lower abdominal pain", "Digestive", ["pain below the belly button"]),
    ("bloating", "Bloating", "Digestive", ["bloated stomach", "swollen belly"]),
    ("excessive-gas", "Excessive gas", "Digestive", ["flatulence", "passing gas often"]),
    ("nausea", "Nausea", "Digestive", ["feeling sick", "feeling like vomiting"]),
    ("vomiting", "Vomiting", "Digestive", ["throwing up", "being sick"]),
    ("diarrhea", "Diarrhea", "Digestive", ["loose stools", "frequent watery stools"]),
    ("constipation", "Constipation", "Digestive", ["difficulty passing stool", "hard stools"]),
    ("heartburn", "Heartburn", "Digestive", ["burning in chest after eating", "acid reflux"]),
    ("indigestion", "Indigestion", "Digestive", ["upset stomach", "difficulty digesting food"]),
    ("blood-in-stool", "Blood in stool", "Digestive", ["blood when passing stool", "bloody stool"]),
    ("black-stool", "Black stool", "Digestive", ["very dark stool", "black bowel movement"]),
    ("rectal-pain", "Rectal pain", "Digestive", ["pain around anus", "pain passing stool"]),
    ("reduced-bowel-control", "Reduced bowel control", "Digestive", ["bowel leakage", "difficulty controlling stool"]),

    # Urinary
    ("painful-urination", "Painful urination", "Urinary", ["burning while peeing", "pain when passing urine"]),
    ("frequent-urination", "Frequent urination", "Urinary", ["peeing often", "urinating a lot"]),
    ("urgent-urination", "Urgent need to urinate", "Urinary", ["sudden urge to pee", "can't hold urine"]),
    ("blood-in-urine", "Blood in urine", "Urinary", ["red urine", "pink urine"]),
    ("dark-urine", "Dark urine", "Urinary", ["brown urine", "unusually dark pee"]),
    ("urinary-leakage", "Urinary leakage", "Urinary", ["urine leaking", "incontinence"]),
    ("difficulty-starting-urination", "Difficulty starting urination", "Urinary", ["hesitancy when peeing"]),
    ("reduced-urine-output", "Reduced urine output", "Urinary", ["peeing less than usual"]),
    ("flank-pain", "Flank pain", "Urinary", ["side pain near the back", "pain near the kidneys"]),

    # Muscles, joints and back
    ("back-pain", "Back pain", "Muscles and joints", ["pain in back", "aching back"]),
    ("neck-pain", "Neck pain", "Muscles and joints", ["sore neck", "stiff neck"]),
    ("joint-pain", "Joint pain", "Muscles and joints", ["aching joints", "painful joints"]),
    ("joint-stiffness", "Joint stiffness", "Muscles and joints", ["stiff joints", "difficulty moving joints"]),
    ("muscle-pain", "Muscle pain", "Muscles and joints", ["sore muscles", "muscle aches"]),
    ("muscle-cramps", "Muscle cramps", "Muscles and joints", ["sudden muscle tightening", "charley horse"]),
    ("muscle-weakness", "Muscle weakness", "Muscles and joints", ["reduced muscle strength"]),
    ("shoulder-pain", "Shoulder pain", "Muscles and joints", ["pain in shoulder"]),
    ("knee-pain", "Knee pain", "Muscles and joints", ["painful knee"]),
    ("hip-pain", "Hip pain", "Muscles and joints", ["pain around hip"]),
    ("wrist-pain", "Wrist pain", "Muscles and joints", ["pain in wrist"]),
    ("ankle-pain", "Ankle pain", "Muscles and joints", ["pain in ankle"]),
    ("limping", "Limping", "Muscles and joints", ["walking unevenly", "difficulty walking normally"]),

    # Skin and hair
    ("rash", "Skin rash", "Skin and hair", ["skin spots", "skin irritation"]),
    ("itchy-skin", "Itchy skin", "Skin and hair", ["itching", "skin feels itchy"]),
    ("dry-skin", "Dry skin", "Skin and hair", ["flaky skin", "rough skin"]),
    ("skin-redness", "Skin redness", "Skin and hair", ["red patches", "inflamed skin"]),
    ("skin-swelling", "Skin swelling", "Skin and hair", ["raised swollen area", "skin lump"]),
    ("hives", "Hives", "Skin and hair", ["itchy raised welts", "urticaria"]),
    ("blisters", "Blisters", "Skin and hair", ["fluid-filled skin bumps"]),
    ("skin-ulcer", "Skin sore that does not heal", "Skin and hair", ["non-healing wound", "persistent skin sore"]),
    ("hair-loss", "Hair loss", "Skin and hair", ["hair thinning", "losing hair"]),
    ("nail-changes", "Nail changes", "Skin and hair", ["brittle nails", "unusual nail appearance"]),
    ("excessive-bruising", "Easy bruising", "Skin and hair", ["bruising easily", "bruises without clear cause"]),
    ("excessive-hair-growth", "Unusual excess hair growth", "Skin and hair", ["more body hair than usual"]),

    # Mental health and sleep
    ("anxiety", "Anxiety", "Mood and sleep", ["feeling anxious", "excessive worry"]),
    ("low-mood", "Low mood", "Mood and sleep", ["feeling down", "sadness"]),
    ("irritability", "Irritability", "Mood and sleep", ["getting annoyed easily", "short temper"]),
    ("sleep-onset-difficulty", "Difficulty falling asleep", "Mood and sleep", ["trouble falling asleep", "can't get to sleep"]),
    ("frequent-night-waking", "Frequent waking during sleep", "Mood and sleep", ["waking up often at night"]),
    ("excessive-sleepiness", "Excessive daytime sleepiness", "Mood and sleep", ["sleepy during the day", "dozing off"]),
    ("panic-like-episodes", "Episodes of intense fear", "Mood and sleep", ["panic-like episodes", "sudden intense anxiety"]),
    ("loss-of-interest", "Loss of interest in usual activities", "Mood and sleep", ["not enjoying things", "lack of interest"]),

    # Endocrine and metabolic
    ("increased-thirst", "Increased thirst", "Endocrine and metabolic", ["always thirsty", "drinking more than usual"]),
    ("increased-urination-volume", "Passing unusually large amounts of urine", "Endocrine and metabolic", ["large amounts of pee"]),
    ("heat-intolerance", "Sensitivity to heat", "Endocrine and metabolic", ["feeling too hot easily"]),
    ("cold-intolerance", "Sensitivity to cold", "Endocrine and metabolic", ["feeling cold easily"]),
    ("shakiness-between-meals", "Shakiness between meals", "Endocrine and metabolic", ["shaky when hungry"]),
    ("delayed-wound-healing", "Slow wound healing", "Endocrine and metabolic", ["cuts taking long to heal"]),

    # Reproductive and pelvic
    ("painful-periods", "Painful menstrual periods", "Reproductive and pelvic", ["period cramps", "menstrual pain"]),
    ("heavy-periods", "Heavy menstrual bleeding", "Reproductive and pelvic", ["very heavy periods", "heavy flow"]),
    ("irregular-periods", "Irregular menstrual periods", "Reproductive and pelvic", ["periods not on schedule"]),
    ("missed-period", "Missed menstrual period", "Reproductive and pelvic", ["period late", "no period"]),
    ("pelvic-pain", "Pelvic pain", "Reproductive and pelvic", ["pain low in the pelvis"]),
    ("painful-intercourse", "Pain during sexual intercourse", "Reproductive and pelvic", ["pain during sex"]),
    ("genital-itching", "Genital itching", "Reproductive and pelvic", ["itching around genitals"]),
    ("genital-discharge", "Unusual genital discharge", "Reproductive and pelvic", ["unexpected discharge"]),
    ("testicular-pain", "Testicular pain", "Reproductive and pelvic", ["pain in testicles"]),
    ("breast-pain", "Breast pain", "Reproductive and pelvic", ["sore breasts", "breast tenderness"]),

    # Mouth and dental
    ("toothache", "Toothache", "Mouth and dental", ["tooth pain", "pain in a tooth"]),
    ("bleeding-gums", "Bleeding gums", "Mouth and dental", ["gums bleed when brushing"]),
    ("bad-breath", "Bad breath", "Mouth and dental", ["unpleasant breath", "halitosis"]),
    ("jaw-pain", "Jaw pain", "Mouth and dental", ["pain when chewing", "sore jaw"]),
    ("dry-mouth", "Dry mouth", "Mouth and dental", ["mouth feels dry", "not enough saliva"]),
    ("taste-changes", "Change in taste", "Mouth and dental", ["food tastes different", "metallic taste"]),

    # Additional common symptoms
    ("dehydration-symptoms", "Possible dehydration symptoms", "General", ["very thirsty with dry mouth", "feeling dehydrated"]),
    ("difficulty-climbing-stairs", "Difficulty climbing stairs", "Mobility", ["struggling with stairs"]),
    ("balance-difficulty", "Difficulty with balance", "Mobility", ["unsteady when standing", "poor balance"]),
    ("reduced-range-of-motion", "Reduced range of motion", "Mobility", ["can't move joint fully"]),
    ("facial-swelling", "Facial swelling", "Skin and hair", ["swollen face", "puffy face"]),
    ("lip-swelling", "Lip swelling", "Skin and hair", ["swollen lips"]),
    ("difficulty-opening-mouth", "Difficulty opening the mouth", "Mouth and dental", ["jaw won't open fully"]),
    ("hiccups", "Hiccups", "Digestive", ["repeated hiccups"]),
    ("excessive-belching", "Excessive belching", "Digestive", ["burping often", "frequent burping"]),
    ("motion-sickness", "Motion sickness", "General", ["feeling sick in a moving vehicle"]),

    # Additional respiratory symptoms
    ("coughing-blood", "Coughing up blood", "Respiratory", ["blood in cough", "bloody phlegm"]),
    ("noisy-breathing", "Noisy breathing", "Respiratory", ["rattling breathing", "unusual breathing sounds"]),
    ("rapid-breathing", "Rapid breathing", "Respiratory", ["breathing too fast"]),
    ("breathing-pause-sleep", "Breathing pauses during sleep", "Respiratory", ["stopping breathing while asleep"]),
    ("snoring", "Snoring", "Respiratory", ["loud snoring"]),
    ("exercise-breathlessness", "Breathlessness during activity", "Respiratory", ["getting out of breath walking"]),
    ("chest-congestion", "Chest congestion", "Respiratory", ["mucus in chest", "heavy chest with a cold"]),
    ("recurrent-respiratory-infections", "Repeated respiratory infections", "Respiratory", ["getting chest infections often"]),

    # Additional heart and circulation symptoms
    ("faint-on-standing", "Feeling faint after standing", "Heart and circulation", ["dizzy when standing up"]),
    ("breathless-lying-flat", "Breathlessness when lying flat", "Heart and circulation", ["needing pillows to breathe"]),
    ("blue-lips", "Bluish lips", "Heart and circulation", ["lips turning blue"]),
    ("pale-skin", "Unusual skin paleness", "Heart and circulation", ["looking unusually pale"]),
    ("leg-pain-walking", "Leg pain while walking", "Heart and circulation", ["calf pain when walking"]),
    ("one-sided-leg-swelling", "Swelling in one leg", "Heart and circulation", ["one leg suddenly swollen"]),
    ("cold-sweats", "Cold sweats", "Heart and circulation", ["clammy sweating"]),
    ("reduced-exercise-tolerance", "Reduced exercise tolerance", "Heart and circulation", ["getting tired more easily during activity"]),

    # Additional neurological symptoms
    ("sudden-confusion", "Sudden confusion", "Head and nerves", ["suddenly disoriented"]),
    ("speech-difficulty", "Difficulty speaking", "Head and nerves", ["slurred speech", "trouble finding words"]),
    ("facial-drooping", "Facial drooping", "Head and nerves", ["one side of face drooping"]),
    ("one-sided-weakness", "Weakness on one side of the body", "Head and nerves", ["one arm or leg suddenly weak"]),
    ("seizure", "Seizure or convulsion", "Head and nerves", ["fits", "uncontrolled shaking episode"]),
    ("loss-of-consciousness", "Loss of consciousness", "Head and nerves", ["became unconscious"]),
    ("new-severe-headache", "Sudden severe headache", "Head and nerves", ["worst headache ever"]),
    ("head-injury-symptoms", "Symptoms after a head injury", "Head and nerves", ["feeling unwell after hitting head"]),
    ("walking-coordination-difficulty", "Difficulty coordinating movements", "Head and nerves", ["clumsy movements", "poor coordination"]),
    ("burning-nerve-pain", "Burning nerve-like pain", "Head and nerves", ["burning sensation in limbs"]),
    ("sensitivity-to-sound", "Sensitivity to sound", "Head and nerves", ["sounds feel too loud"]),
    ("smell-loss", "Loss of smell", "Head and nerves", ["can't smell things"]),
    ("smell-change", "Changed sense of smell", "Head and nerves", ["things smell different"]),
    ("taste-loss", "Loss of taste", "Head and nerves", ["can't taste food"]),
    ("restless-legs", "Restless legs", "Head and nerves", ["urge to move legs at rest"]),

    # Additional digestive symptoms
    ("difficulty-passing-gas", "Difficulty passing gas", "Digestive", ["can't pass gas"]),
    ("early-fullness", "Feeling full quickly", "Digestive", ["full after a few bites"]),
    ("loss-of-bowel-control", "Loss of bowel control", "Digestive", ["accidental stool leakage"]),
    ("mucus-in-stool", "Mucus in stool", "Digestive", ["slimy stool"]),
    ("pale-stool", "Pale or clay-colored stool", "Digestive", ["very light-colored stool"]),
    ("greasy-stool", "Greasy or oily stool", "Digestive", ["floating oily stool"]),
    ("painful-bowel-movement", "Pain during bowel movements", "Digestive", ["pain when pooping"]),
    ("rectal-itching", "Anal itching", "Digestive", ["itchy anus"]),
    ("abdominal-cramps", "Abdominal cramps", "Digestive", ["stomach cramps"]),
    ("food-sticking-throat", "Food feels stuck when swallowing", "Digestive", ["food stuck in throat"]),
    ("regurgitation", "Food or liquid coming back up", "Digestive", ["food coming back into mouth"]),
    ("persistent-vomiting", "Repeated or persistent vomiting", "Digestive", ["vomiting again and again"]),
    ("yellow-skin", "Yellowing of the skin", "Digestive", ["yellow skin"]),
    ("yellow-eyes", "Yellowing of the whites of the eyes", "Digestive", ["yellow eyes"]),
    ("persistent-hiccups", "Persistent hiccups", "Digestive", ["hiccups that won't stop"]),
    ("rectal-bleeding", "Bleeding from the rectum", "Digestive", ["blood from anus"]),
    ("abdominal-lump", "Lump or swelling in the abdomen", "Digestive", ["lump in belly"]),
    ("groin-lump", "Lump in the groin", "Digestive", ["groin swelling"]),
    ("pain-after-eating", "Abdominal pain after eating", "Digestive", ["stomach hurts after meals"]),
    ("swollen-abdomen", "Visible abdominal swelling", "Digestive", ["distended belly", "belly looks enlarged"]),

    # Additional urinary and kidney symptoms
    ("inability-to-urinate", "Unable to pass urine", "Urinary", ["can't pee despite needing to"]),
    ("weak-urine-stream", "Weak urine stream", "Urinary", ["urine comes out slowly"]),
    ("dribbling-after-urination", "Dribbling after urination", "Urinary", ["urine drips after peeing"]),
    ("nighttime-urination", "Waking at night to urinate", "Urinary", ["peeing multiple times at night"]),
    ("urine-odor-change", "Unusual urine smell", "Urinary", ["strong-smelling urine"]),
    ("foamy-urine", "Foamy urine", "Urinary", ["persistent bubbles in urine"]),
    ("bladder-pain", "Bladder-area pain", "Urinary", ["pain low in the middle of the abdomen"]),
    ("urinary-retention-feeling", "Feeling unable to empty the bladder", "Urinary", ["urine left after peeing"]),
    ("bedwetting", "Bedwetting", "Urinary", ["wetting the bed during sleep"]),
    ("urine-leak-coughing", "Urine leakage when coughing or sneezing", "Urinary", ["leaking urine when laughing"]),
    ("kidney-area-tenderness", "Tenderness near the kidney area", "Urinary", ["pain when side or back is touched"]),

    # Additional skin symptoms
    ("skin-burning", "Burning sensation on the skin", "Skin and hair", ["skin feels like it's burning"]),
    ("skin-peeling", "Peeling skin", "Skin and hair", ["skin coming off in flakes"]),
    ("skin-darkening", "Unusual skin darkening", "Skin and hair", ["dark patches on skin"]),
    ("skin-light-patches", "Light-colored skin patches", "Skin and hair", ["white patches on skin"]),
    ("skin-lump", "New lump under the skin", "Skin and hair", ["small bump under skin"]),
    ("boils", "Boils or painful skin lumps", "Skin and hair", ["pus-filled skin lump"]),
    ("skin-infection-signs", "Possible skin infection signs", "Skin and hair", ["redness with warmth or pus"]),
    ("insect-bite-reaction", "Reaction to an insect bite", "Skin and hair", ["swelling after a bite"]),
    ("sun-sensitivity", "Skin sensitivity to sunlight", "Skin and hair", ["rash after sun exposure"]),
    ("excessive-scalp-flaking", "Excessive scalp flaking", "Skin and hair", ["flaky scalp", "dandruff"]),
    ("scalp-itching", "Itchy scalp", "Skin and hair", ["head itching"]),
    ("excessive-skin-oiliness", "Excessively oily skin", "Skin and hair", ["very oily face"]),
    ("acne", "Acne or pimples", "Skin and hair", ["breakouts", "spots on face"]),
    ("cold-sores", "Cold sores around the mouth", "Skin and hair", ["lip blisters"]),
    ("pressure-sores", "Pressure sores", "Skin and hair", ["bed sores"]),
    ("wound-discharge", "Discharge from a wound", "Skin and hair", ["pus or fluid from cut"]),

    # Additional eye symptoms
    ("floaters", "Floaters in vision", "Eyes", ["spots drifting across vision"]),
    ("flashing-lights-vision", "Flashes of light in vision", "Eyes", ["seeing sudden flashes"]),
    ("eyelid-swelling", "Swollen eyelid", "Eyes", ["puffy eyelid"]),
    ("eyelid-lump", "Lump on the eyelid", "Eyes", ["stye-like bump"]),
    ("difficulty-seeing-at-night", "Difficulty seeing at night", "Eyes", ["poor night vision"]),
    ("loss-of-peripheral-vision", "Reduced side vision", "Eyes", ["can't see things at the sides"]),
    ("eye-foreign-body-feeling", "Feeling something in the eye", "Eyes", ["gritty feeling in eye"]),
    ("unequal-pupils", "Unequal pupil sizes", "Eyes", ["one pupil larger than the other"]),
    ("excessive-blinking", "Excessive blinking", "Eyes", ["blinking eyes repeatedly"]),
    ("crossed-eyes", "Eyes not aligned", "Eyes", ["crossed eyes", "eyes pointing in different directions"]),

    # Additional ear, nose and throat symptoms
    ("ear-fullness", "Fullness or pressure in the ear", "Ear, nose and throat", ["blocked feeling in ear"]),
    ("ear-discharge", "Fluid coming from the ear", "Ear, nose and throat", ["ear leaking fluid"]),
    ("ear-itching", "Itchy ears", "Ear, nose and throat", ["itch inside ear"]),
    ("loss-of-voice", "Loss of voice", "Ear, nose and throat", ["can't speak normally"]),
    ("nasal-bleeding", "Nosebleeds", "Ear, nose and throat", ["blood from nose"]),
    ("reduced-sense-of-smell", "Reduced sense of smell", "Ear, nose and throat", ["smell is weaker"]),
    ("postnasal-drip", "Mucus dripping down the throat", "Ear, nose and throat", ["mucus at back of throat"]),
    ("tonsil-swelling", "Swollen tonsils", "Ear, nose and throat", ["enlarged tonsils"]),
    ("neck-lump", "Lump or swelling in the neck", "Ear, nose and throat", ["swollen gland in neck"]),
    ("snoring-nasal-blockage", "Nasal blockage during sleep", "Ear, nose and throat", ["can't breathe through nose at night"]),

    # Additional mouth and dental symptoms
    ("tooth-sensitivity", "Sensitive teeth", "Mouth and dental", ["pain with hot or cold food"]),
    ("loose-tooth", "Loose tooth", "Mouth and dental", ["adult tooth feels wobbly"]),
    ("swollen-gums", "Swollen gums", "Mouth and dental", ["puffy gums"]),
    ("tongue-pain", "Tongue pain", "Mouth and dental", ["sore tongue"]),
    ("tongue-swelling", "Tongue swelling", "Mouth and dental", ["swollen tongue"]),
    ("white-mouth-patches", "White patches in the mouth", "Mouth and dental", ["white coating inside mouth"]),
    ("mouth-burning", "Burning sensation in the mouth", "Mouth and dental", ["mouth feels like burning"]),
    ("difficulty-chewing", "Difficulty chewing", "Mouth and dental", ["trouble chewing food"]),
    ("excessive-drooling", "Excessive drooling", "Mouth and dental", ["too much saliva"]),
    ("mouth-dryness-at-night", "Dry mouth at night", "Mouth and dental", ["wake up with dry mouth"]),

    # Additional musculoskeletal symptoms
    ("heel-pain", "Heel pain", "Muscles and joints", ["pain under heel"]),
    ("foot-pain", "Foot pain", "Muscles and joints", ["pain in feet"]),
    ("elbow-pain", "Elbow pain", "Muscles and joints", ["pain around elbow"]),
    ("finger-pain", "Finger pain", "Muscles and joints", ["pain in fingers"]),
    ("toe-pain", "Toe pain", "Muscles and joints", ["pain in toes"]),
    ("jaw-joint-clicking", "Clicking jaw joint", "Muscles and joints", ["jaw clicks when opening"]),
    ("muscle-twitching", "Muscle twitching", "Muscles and joints", ["muscles jumping on their own"]),
    ("limb-stiffness", "Stiffness in arms or legs", "Muscles and joints", ["limbs feel stiff"]),
    ("morning-joint-stiffness", "Joint stiffness in the morning", "Muscles and joints", ["stiff joints after waking"]),
    ("bone-pain", "Bone pain", "Muscles and joints", ["deep pain in bones"]),
    ("rib-pain", "Rib pain", "Muscles and joints", ["pain along ribs"]),
    ("tailbone-pain", "Tailbone pain", "Muscles and joints", ["pain at base of spine"]),
    ("muscle-wasting", "Noticeable muscle loss", "Muscles and joints", ["muscles getting smaller"]),
    ("frequent-falls", "Frequent falls", "Mobility", ["falling often"]),
    ("difficulty-standing", "Difficulty standing up", "Mobility", ["trouble getting up from a chair"]),

    # Additional mood, cognition and sleep symptoms
    ("nightmares", "Frequent nightmares", "Mood and sleep", ["bad dreams often"]),
    ("sleepwalking", "Sleepwalking", "Mood and sleep", ["walking while asleep"]),
    ("sleep-talking", "Talking during sleep", "Mood and sleep", ["speaking while asleep"]),
    ("difficulty-staying-asleep", "Difficulty staying asleep", "Mood and sleep", ["waking and unable to return to sleep"]),
    ("excessive-worry", "Excessive worrying", "Mood and sleep", ["worrying all the time"]),
    ("low-motivation", "Low motivation", "Mood and sleep", ["no motivation to do things"]),
    ("social-withdrawal", "Withdrawing from other people", "Mood and sleep", ["avoiding friends and family"]),
    ("unusual-perceptions", "Seeing or hearing things others do not", "Mood and sleep", ["unusual sensory experiences"]),
    ("racing-thoughts", "Racing thoughts", "Mood and sleep", ["mind won't slow down"]),
    ("daytime-fatigue-after-sleep", "Unrefreshing sleep", "Mood and sleep", ["still tired after sleeping"]),

    # Additional endocrine and general symptoms
    ("hot-flashes", "Hot flashes", "Endocrine and metabolic", ["sudden waves of heat"]),
    ("excessive-hunger", "Persistent excessive hunger", "Endocrine and metabolic", ["hungry soon after eating"]),
    ("unusual-body-odor", "Change in body odor", "General", ["body smells different"]),
    ("persistent-bad-taste", "Persistent bad taste in the mouth", "General", ["bad taste that won't go away"]),
    ("recurrent-fevers", "Repeated episodes of fever", "General", ["fever keeps coming back"]),
    ("prolonged-fatigue", "Fatigue lasting a long time", "General", ["tired for weeks"]),
    ("recurrent-infections", "Frequent infections", "General", ["getting sick often"]),
    ("reduced-fluid-intake", "Difficulty drinking enough fluids", "General", ["unable to drink much"]),
    ("swallowing-pills-difficulty", "Difficulty swallowing pills", "General", ["pills get stuck"]),
    ("exercise-related-cramps", "Cramps during exercise", "General", ["cramping while working out"]),

    # Menstrual, reproductive and pregnancy-related symptoms
    ("spotting-between-periods", "Spotting between periods", "Reproductive and pelvic", ["bleeding between periods"]),
    ("bleeding-after-sex", "Bleeding after sex", "Reproductive and pelvic", ["spotting after intercourse"]),
    ("vaginal-dryness", "Vaginal dryness", "Reproductive and pelvic", ["dryness in vagina"]),
    ("vaginal-odor-change", "Change in vaginal odor", "Reproductive and pelvic", ["unusual vaginal smell"]),
    ("breast-lump", "Breast lump", "Reproductive and pelvic", ["lump in breast"]),
    ("nipple-discharge", "Nipple discharge", "Reproductive and pelvic", ["fluid from nipple"]),
    ("erection-difficulty", "Difficulty getting or keeping an erection", "Reproductive and pelvic", ["erectile difficulty"]),
    ("reduced-sexual-desire", "Reduced sexual desire", "Reproductive and pelvic", ["low sex drive"]),
    ("painful-ejaculation", "Pain during ejaculation", "Reproductive and pelvic", ["pain when ejaculating"]),
    ("scrotal-swelling", "Scrotal swelling", "Reproductive and pelvic", ["swollen scrotum"]),
    ("pregnancy-nausea", "Nausea during pregnancy", "Pregnancy", ["morning sickness"]),
    ("pregnancy-vomiting", "Vomiting during pregnancy", "Pregnancy", ["pregnancy-related vomiting"]),
    ("pregnancy-heartburn", "Heartburn during pregnancy", "Pregnancy", ["acid reflux while pregnant"]),
    ("pregnancy-back-pain", "Back pain during pregnancy", "Pregnancy", ["pregnancy-related backache"]),
    ("pregnancy-ankle-swelling", "Ankle swelling during pregnancy", "Pregnancy", ["swollen feet while pregnant"]),
    ("pregnancy-itching", "Itching during pregnancy", "Pregnancy", ["itchy skin while pregnant"]),
    ("pregnancy-reduced-fetal-movement", "Reduced fetal movement", "Pregnancy", ["baby moving less than usual"]),
    ("pregnancy-fluid-leakage", "Fluid leaking during pregnancy", "Pregnancy", ["possible waters breaking"]),
    ("pregnancy-vaginal-bleeding", "Vaginal bleeding during pregnancy", "Pregnancy", ["bleeding while pregnant"]),
    ("pregnancy-severe-headache", "Severe headache during pregnancy", "Pregnancy", ["bad headache while pregnant"]),

    # Infant and child symptoms
    ("child-poor-feeding", "Poor feeding in an infant", "Infant and child", ["baby feeding less than usual"]),
    ("child-refusing-food", "Child refusing food", "Infant and child", ["child won't eat"]),
    ("child-unusual-sleepiness", "Unusual sleepiness in a child", "Infant and child", ["child is much sleepier than usual"]),
    ("child-irritability", "Unusual irritability in a child", "Infant and child", ["baby unusually fussy"]),
    ("child-inconsolable-crying", "Persistent inconsolable crying", "Infant and child", ["baby won't stop crying"]),
    ("child-delayed-speech", "Speech development concerns", "Infant and child", ["child not talking as expected"]),
    ("child-development-concern", "Developmental concern", "Infant and child", ["child not meeting milestones"]),
    ("child-growth-concern", "Growth concern", "Infant and child", ["child not growing as expected"]),
    ("child-recurrent-ear-infections", "Repeated ear infections in a child", "Infant and child", ["child keeps getting ear infections"]),
    ("child-bedwetting", "Bedwetting in a child", "Infant and child", ["child wets bed"]),
    ("child-daytime-wetting", "Daytime urine accidents in a child", "Infant and child", ["child wets clothes during day"]),
    ("child-constipation", "Constipation in a child", "Infant and child", ["child struggling to poop"]),
    ("child-recurrent-abdominal-pain", "Repeated abdominal pain in a child", "Infant and child", ["child often complains of stomach ache"]),
    ("child-limping", "Limping in a child", "Infant and child", ["child walking unevenly"]),
    ("child-skin-rash", "Skin rash in a child", "Infant and child", ["child has rash"]),
    ("child-wheezing", "Wheezing in a child", "Infant and child", ["child making whistling breathing sounds"]),
    ("child-frequent-thirst", "Frequent thirst in a child", "Infant and child", ["child always thirsty"]),
    ("child-excessive-urination", "Frequent urination in a child", "Infant and child", ["child peeing often"]),
    ("child-joint-swelling", "Joint swelling in a child", "Infant and child", ["child has swollen joint"]),
    ("child-school-concentration", "Difficulty concentrating at school", "Infant and child", ["child struggles to focus in class"]),

]


def main():
    db_generator = get_db()
    db = next(db_generator)

    try:
        inserted = 0
        updated = 0

        for symptom_id, name, category, aliases in SYMPTOMS:
            existing = db.get(models.SymptomCatalog, symptom_id)

            if existing is None:
                db.add(
                    models.SymptomCatalog(
                        id=symptom_id,
                        name=name,
                        category=category,
                        aliases=aliases,
                        is_active=True,
                    )
                )
                inserted += 1
            else:
                existing.name = name
                existing.category = category
                existing.aliases = aliases
                existing.is_active = True
                updated += 1

        db.commit()
        print(f"Seed complete: {inserted} inserted, {updated} updated.")
        print(f"Catalog entries in this seed: {len(SYMPTOMS)}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        db_generator.close()


if __name__ == "__main__":
    main()
