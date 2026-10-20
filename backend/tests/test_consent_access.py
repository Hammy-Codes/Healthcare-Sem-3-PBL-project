from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import select
import models


def add_consent(env, *, status="granted", expired=False, revoked=False):
    with env["session_factory"]() as db:
        consent = models.PatientConsent(
            id=uuid4(),
            patient_id=env["patient_id"],
            doctor_id=env["doctor_id"],
            scope="profile",
            status=status,
            expires_at=(
                datetime.now(timezone.utc) - timedelta(minutes=5)
                if expired
                else None
            ),
            revoked_at=(
                datetime.now(timezone.utc)
                if revoked
                else None
            ),
        )
        db.add(consent)
        db.commit()


def get_doctor_profile(env):
    return env["client"].get(
        f"/doctors/patients/{env['patient_id']}/profile",
        headers={
            "Authorization": f"Bearer {env['doctor_token']}"
        },
    )


def test_doctor_without_consent_is_forbidden(test_environment):
    response = get_doctor_profile(test_environment)

    assert response.status_code == 403
    assert response.json()["detail"] == "Valid profile consent required"


def test_doctor_with_valid_consent_can_access_profile(test_environment):
    env = test_environment
    add_consent(env)

    response = get_doctor_profile(env)

    assert response.status_code == 200, response.text

def test_doctor_with_expired_consent_is_forbidden(test_environment):
    add_consent(test_environment, expired=True)

    response = get_doctor_profile(test_environment)

    assert response.status_code == 403


def test_later_revocation_overrides_earlier_grant(test_environment):
    env = test_environment

    # First, create a valid grant.
    add_consent(env)

    # Then create a later revocation for the same patient and doctor.
    with env["session_factory"]() as db:
        revoked_at = datetime.now(timezone.utc)
        db.add(
            models.PatientConsent(
                id=uuid4(),
                patient_id=env["patient_id"],
                doctor_id=env["doctor_id"],
                scope="profile",
                status="revoked",
                granted_at=revoked_at + timedelta(seconds=1),
                revoked_at=revoked_at,
            )
        )
        db.commit()

    response = get_doctor_profile(env)

    assert response.status_code == 403
    assert response.json()["detail"] == "Valid profile consent required"


def test_ended_care_relationship_blocks_doctor_access(test_environment):
    env = test_environment
    add_consent(env)

    with env["session_factory"]() as db:
        relationship = db.scalar(
            select(models.CareRelationship).where(
                models.CareRelationship.patient_id == env["patient_id"],
                models.CareRelationship.doctor_id == env["doctor_id"],
            )
        )

        assert relationship is not None
        relationship.ended_at = datetime.now(timezone.utc)
        db.commit()

    response = get_doctor_profile(env)

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "No active care relationship with this patient"
    )