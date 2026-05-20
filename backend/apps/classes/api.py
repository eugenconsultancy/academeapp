from typing import List, Optional
from uuid import UUID
from django.shortcuts import get_object_or_404
from ninja import Router
from common.jwt_auth import JWTAuth
from .models import ClassGroup, TimetableEntry, AttendanceRecord
from .services import AttendanceService, TimetableService
from .schema import (
    TimetableEntryCreate, TimetableEntryUpdate, TimetableEntryOutDetail,
)

router = Router()

# ---------- Helper ----------
def is_class_rep_of(user, class_group_id: str) -> bool:
    """Return True if the user is the class representative of the given class group."""
    return ClassGroup.objects.filter(id=class_group_id, class_rep=user).exists()

# ========== EXISTING ENDPOINTS ==========

@router.get("/timetable/", auth=JWTAuth())
def get_timetable(request):
    """Get all timetable entries for the authenticated user (student)."""
    class_groups = ClassGroup.objects.filter(students=request.auth)
    entries = TimetableEntry.objects.filter(class_group__in=class_groups, is_active=True)
    return [{
        "id": str(e.id),
        "unit_name": e.unit_name,
        "day_of_week": e.day_of_week,
        "start_time": str(e.start_time),
        "end_time": str(e.end_time),
        "venue": e.venue,
        "lecturer": e.lecturer,
        "is_active": e.is_active
    } for e in entries]

@router.get("/today/", auth=JWTAuth())
def get_today_classes(request):
    """Get today's classes for the authenticated user."""
    classes = TimetableService.get_today_classes(request.auth)
    return classes

@router.post("/mark-attendance/", auth=JWTAuth())
def mark_attendance(request, data: dict):
    """Mark attendance for a given timetable entry."""
    record, error = AttendanceService.mark_attendance(
        request.auth,
        data.get("timetable_entry_id")
    )
    if error:
        return {"error": error}
    return {"message": "Attendance marked", "id": str(record.id)}

@router.get("/weekly-summary/", auth=JWTAuth())
def get_weekly_summary(request):
    """Get attendance summary for the current week."""
    summary = AttendanceService.get_weekly_summary(request.auth)
    return summary

# ========== NEW ENDPOINT FOR CLASS REPRESENTATIVE ==========
@router.get("/my-represented-class/", auth=JWTAuth())
def get_represented_class(request):
    """
    Returns the class group where the authenticated user is the class representative.
    Useful for frontend to know which class the rep can manage.
    """
    user = request.auth
    try:
        class_group = ClassGroup.objects.get(class_rep=user)
        return {
            "id": str(class_group.id),
            "name": class_group.name,
            "institution": class_group.institution,
        }
    except ClassGroup.DoesNotExist:
        from ninja.errors import HttpError
        raise HttpError(404, "You are not a class representative for any class")

# ========== CRUD ENDPOINTS FOR TIMETABLE MANAGEMENT (CLASS REP ONLY) ==========

@router.get("/timetable/class/{class_group_id}/", auth=JWTAuth(), response=List[TimetableEntryOutDetail])
def get_class_timetable(request, class_group_id: str):
    """
    Get all timetable entries for a specific class.
    Accessible to:
      - Students enrolled in the class
      - The class representative
      - Admin users
    """
    user = request.auth
    class_group = get_object_or_404(ClassGroup, id=class_group_id)

    # Check permissions
    is_admin = user.role == "admin"
    is_enrolled = class_group.students.filter(id=user.id).exists()
    is_class_rep = class_group.class_rep_id == user.id
    if not (is_admin or is_enrolled or is_class_rep):
        from ninja.errors import HttpError
        raise HttpError(403, "You are not a member of this class")

    entries = TimetableEntry.objects.filter(class_group=class_group, is_active=True)
    return [{
        "id": str(e.id),
        "class_group_id": str(e.class_group_id),
        "day_of_week": e.day_of_week,
        "start_time": str(e.start_time),
        "end_time": str(e.end_time),
        "unit_name": e.unit_name,
        "venue": e.venue,
        "lecturer": e.lecturer,
        "is_active": e.is_active,
    } for e in entries]

@router.post("/timetable/", auth=JWTAuth(), response={201: TimetableEntryOutDetail, 403: dict})
def create_timetable_entry(request, payload: TimetableEntryCreate):
    """
    Create a new timetable entry (class rep only).
    """
    user = request.auth
    class_group_id = str(payload.class_group_id)

    if not is_class_rep_of(user, class_group_id):
        return 403, {"error": "Only the class representative can add timetable entries"}

    class_group = get_object_or_404(ClassGroup, id=class_group_id)
    entry = TimetableEntry.objects.create(
        class_group=class_group,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        unit_name=payload.unit_name,
        venue=payload.venue,
        lecturer=payload.lecturer or "",
        is_active=True
    )

    return 201, {
        "id": str(entry.id),
        "class_group_id": str(entry.class_group_id),
        "day_of_week": entry.day_of_week,
        "start_time": str(entry.start_time),
        "end_time": str(entry.end_time),
        "unit_name": entry.unit_name,
        "venue": entry.venue,
        "lecturer": entry.lecturer,
        "is_active": entry.is_active,
    }

@router.put("/timetable/{entry_id}/", auth=JWTAuth(), response={200: TimetableEntryOutDetail, 403: dict, 404: dict})
def update_timetable_entry(request, entry_id: UUID, payload: TimetableEntryUpdate):
    """
    Update an existing timetable entry (class rep only).
    """
    user = request.auth
    entry = get_object_or_404(TimetableEntry, id=entry_id)

    if not is_class_rep_of(user, str(entry.class_group_id)):
        return 403, {"error": "Only the class representative can edit this timetable entry"}

    # Update only provided fields
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.save()

    return 200, {
        "id": str(entry.id),
        "class_group_id": str(entry.class_group_id),
        "day_of_week": entry.day_of_week,
        "start_time": str(entry.start_time),
        "end_time": str(entry.end_time),
        "unit_name": entry.unit_name,
        "venue": entry.venue,
        "lecturer": entry.lecturer,
        "is_active": entry.is_active,
    }

@router.delete("/timetable/{entry_id}/", auth=JWTAuth(), response={204: None, 403: dict, 404: dict})
def delete_timetable_entry(request, entry_id: UUID):
    """
    Delete a timetable entry (class rep only).
    """
    user = request.auth
    entry = get_object_or_404(TimetableEntry, id=entry_id)

    if not is_class_rep_of(user, str(entry.class_group_id)):
        return 403, {"error": "Only the class representative can delete this timetable entry"}

    entry.delete()
    return 204, None