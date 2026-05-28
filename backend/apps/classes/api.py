from typing import List, Optional
from uuid import UUID
from django.shortcuts import get_object_or_404
from ninja import Router, Query
from ninja.errors import HttpError
from common.jwt_auth import JWTAuth
from .models import ClassGroup, TimetableEntry, AttendanceRecord
from .services import AttendanceService, TimetableService
from .schema import (
    TimetableEntryCreate, TimetableEntryUpdate, TimetableEntryOutDetail,
    AttendanceMarkIn, ClassGroupOut,
    AttendanceFilterParams, AttendanceRecordOut,
    ClassAttendanceSummaryOut, CheckInSummaryOut,
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
        "is_active": e.is_active,
        "latitude": float(e.latitude) if e.latitude else None,
        "longitude": float(e.longitude) if e.longitude else None,
    } for e in entries]


@router.get("/today/", auth=JWTAuth())
def get_today_classes(request):
    """Get today's classes for the authenticated user."""
    classes = TimetableService.get_today_classes(request.auth)
    return classes


@router.post("/mark-attendance/", auth=JWTAuth())
def mark_attendance(request, data: AttendanceMarkIn):
    """Mark attendance with optional geofence verification."""
    record, error = AttendanceService.mark_attendance(
        request.auth,
        data.timetable_entry_id,
        student_lat=data.student_lat,
        student_lon=data.student_lon
    )
    if error:
        raise HttpError(400, error)
    return {"message": "Attendance marked", "id": str(record.id)}


@router.get("/weekly-summary/", auth=JWTAuth())
def get_weekly_summary(request):
    """Get attendance summary for the current week."""
    summary = AttendanceService.get_weekly_summary(request.auth)
    return summary


# ========== NEW ENDPOINT FOR CLASS REPRESENTATIVE ==========
@router.get("/my-represented-class/", auth=JWTAuth())
def get_represented_class(request):
    user = request.auth
    try:
        class_group = ClassGroup.objects.get(class_rep=user)
        return {
            "id": str(class_group.id),
            "name": class_group.name,
            "institution": class_group.institution,
        }
    except ClassGroup.DoesNotExist:
        raise HttpError(404, "You are not a class representative for any class")


# ========== ADMIN: LIST ALL CLASS GROUPS ==========
@router.get("/class-groups/", auth=JWTAuth(), response=List[ClassGroupOut])
def list_class_groups(request):
    """Return all class groups (for admins to manage any timetable)."""
    if request.auth.role != "admin":
        raise HttpError(403, "Only admins can list all class groups")
    groups = ClassGroup.objects.all()
    return [{"id": str(g.id), "name": g.name, "institution": g.institution} for g in groups]


# ========== CRUD ENDPOINTS FOR TIMETABLE MANAGEMENT (CLASS REP / ADMIN) ==========

@router.get("/timetable/class/{class_group_id}/", auth=JWTAuth(), response=List[TimetableEntryOutDetail])
def get_class_timetable(request, class_group_id: str):
    user = request.auth
    class_group = get_object_or_404(ClassGroup, id=class_group_id)

    is_admin = user.role == "admin"
    is_enrolled = class_group.students.filter(id=user.id).exists()
    is_class_rep = class_group.class_rep_id == user.id
    if not (is_admin or is_enrolled or is_class_rep):
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
        "latitude": float(e.latitude) if e.latitude else None,
        "longitude": float(e.longitude) if e.longitude else None,
    } for e in entries]


@router.post("/timetable/", auth=JWTAuth(), response={201: TimetableEntryOutDetail, 403: dict})
def create_timetable_entry(request, payload: TimetableEntryCreate):
    user = request.auth
    class_group_id = str(payload.class_group_id)

    if user.role != "admin" and not is_class_rep_of(user, class_group_id):
        return 403, {"error": "Only the class representative or admin can add timetable entries"}

    class_group = get_object_or_404(ClassGroup, id=class_group_id)
    entry = TimetableEntry.objects.create(
        class_group=class_group,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        unit_name=payload.unit_name,
        venue=payload.venue,
        lecturer=payload.lecturer or "",
        latitude=payload.latitude,
        longitude=payload.longitude,
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
        "latitude": float(entry.latitude) if entry.latitude else None,
        "longitude": float(entry.longitude) if entry.longitude else None,
    }


@router.put("/timetable/{entry_id}/", auth=JWTAuth(), response={200: TimetableEntryOutDetail, 403: dict, 404: dict})
def update_timetable_entry(request, entry_id: UUID, payload: TimetableEntryUpdate):
    user = request.auth
    entry = get_object_or_404(TimetableEntry, id=entry_id)

    if user.role != "admin" and not is_class_rep_of(user, str(entry.class_group_id)):
        return 403, {"error": "Only the class representative or admin can edit this timetable entry"}

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
        "latitude": float(entry.latitude) if entry.latitude else None,
        "longitude": float(entry.longitude) if entry.longitude else None,
    }


@router.delete("/timetable/{entry_id}/", auth=JWTAuth(), response={204: None, 403: dict, 404: dict})
def delete_timetable_entry(request, entry_id: UUID):
    user = request.auth
    entry = get_object_or_404(TimetableEntry, id=entry_id)

    if user.role != "admin" and not is_class_rep_of(user, str(entry.class_group_id)):
        return 403, {"error": "Only the class representative or admin can delete this timetable entry"}

    entry.delete()
    return 204, None


# ============================================
# ATTENDANCE DETAIL (EXISTING)
# ============================================
@router.get("/attendance/{entry_id}/", auth=JWTAuth())
def get_entry_attendance(request, entry_id: UUID):
    """Get attendance records for a specific timetable entry."""
    entry = get_object_or_404(TimetableEntry, id=entry_id)
    if not (entry.class_group.class_rep == request.auth or
            entry.class_group.students.filter(id=request.auth.id).exists()):
        raise HttpError(403, "You are not a member of this class")
    records = AttendanceRecord.objects.filter(timetable_entry=entry).select_related('student')
    return [{
        "id": str(r.id),
        "student_name": r.student.full_name,
        "date": str(r.date),
        "status": "PRESENT",
        "sync_method": r.sync_method,
    } for r in records]


# ══════════════════════════════════════════════════
# NEW ENDPOINTS (FILTERED LIST, CLASS SUMMARY, CHECK‑IN)
# ══════════════════════════════════════════════════

@router.get("/attendance/", auth=JWTAuth(), response=List[AttendanceRecordOut])
def list_attendance(request, filters: AttendanceFilterParams = Query(...)):
    """Get attendance records with optional filters."""
    qs = AttendanceService.get_filtered_records(
        filters.dict(exclude_none=True), request.auth
    )
    return [
        {
            "id": str(r.id),
            "student_id": str(r.student_id),
            "student_name": r.student.full_name,
            "timetable_entry_id": str(r.timetable_entry_id),
            "unit_name": r.timetable_entry.unit_name,
            "date": str(r.date),
            "marked_at": str(r.marked_at),
            "sync_method": r.sync_method,
        }
        for r in qs
    ]


@router.get("/attendance/class-summary/", auth=JWTAuth(), response=List[ClassAttendanceSummaryOut])
def class_attendance_summary(request, class_id: str, term_id: str):
    """Return per‑student attendance summary for a class and term."""
    # Optional: add permission check (admin or class rep of the class)
    summary = AttendanceService.class_attendance_summary(class_id, term_id)
    return summary


@router.get("/attendance/checkin-summary/", auth=JWTAuth(), response=CheckInSummaryOut)
def checkin_summary(request):
    """Return today's and this week's attendance count for the current user."""
    return AttendanceService.checkin_summary(request.auth)