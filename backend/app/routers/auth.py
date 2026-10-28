"""Authentication endpoints: register, login, and me."""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.core.rate_limit import auth_rate_limiter
from app.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterPatientRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient account",
)
def register_patient(
    payload: RegisterPatientRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Register a new patient account. Self-registration is strictly restricted to patient role."""
    auth_rate_limiter.check(request)

    # Check for existing email (case-insensitive due to lowercasing validator)
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise AppError(
            status_code=status.HTTP_409_CONFLICT,
            code="EMAIL_ALREADY_EXISTS",
            message="An account with this email already exists. Please log in or use another email.",
            fields={"email": "Email is already registered"},
        )

    # Create new patient user
    new_user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=UserRole.PATIENT.value,
        phone=payload.phone,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT access token
    access_token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role, "email": new_user.email})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login with email and password",
)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate a patient or doctor and issue a JWT access token."""
    auth_rate_limiter.check(request)

    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise AppError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_CREDENTIALS",
            message="Invalid email or password. Please check your credentials.",
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile and role information for currently authenticated user."""
    return UserResponse.model_validate(current_user)
