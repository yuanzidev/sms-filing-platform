"""
Author: yuanzi
Date: 2025-12-11
Description: 
"""
from sqlmodel import SQLModel


class Token(SQLModel):
    """JWT令牌模型"""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    """JWT令牌载荷模型"""
    sub: str


class Message(SQLModel):
    """通用消息模型"""
    message: str 