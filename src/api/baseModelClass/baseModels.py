from pydantic import BaseModel
from typing import List

class audioFile(BaseModel):
    id: str
    label: str
    type: str

class audioFileList(BaseModel):
    audioFiles: List[audioFile]