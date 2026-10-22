# CareBridge appointment feature (presentation build)

This update adds a backend-backed appointment booking flow and a live doctor directory.

## Apply

1. Back up your current project folder.
2. Copy the files from this archive over the matching paths in your repository.
3. Activate the backend virtual environment and run from `backend`:

   ```powershell
   python -m alembic upgrade head
   python -m pytest -q
   python -m uvicorn main:app --reload
   ```

4. In a second terminal, run from `frontend`:

   ```powershell
   npm install
   npm run build
   npm run dev
   ```

5. Sign in with a patient account that already has a patient profile. Open **Appointments** in the sidebar.

## Important

- The doctor directory lists doctor accounts already stored in the database. The appointment screen will show an empty state if none exist.
- Appointment booking requires a future date/time and a short reason. Patients can view and cancel their own booked appointments.
- This is a project demonstration, not a production-ready scheduling system: provider availability, collision detection, notifications, payments, and clinical triage are not implemented.
- Do not use real patient information for a public demonstration.
- Existing synthetic vitals and timeline screens remain marked/demo-backed; this update does not claim to make those sources live.
