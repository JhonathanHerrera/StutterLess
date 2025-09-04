from pydantic import BaseModel
from typing import List

class ItemIn(BaseModel):
    item: str = None
    is_done: bool = False

class audioFile(BaseModel):
    id: str
    label: str
    type: str

class audioFileList(BaseModel):
    audioFiles: List[audioFile]