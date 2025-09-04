from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from baseModelClass.baseModels import audioFile, audioFileList
from typing import List

app = FastAPI()

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
	allow_methods=["*"],
	allow_headers=["*"],
)

# Use: uvicorn endpoints:app --reload
# Use: curl -X POST -H "Content-Type: application/json" 'http://127.0.0.1:8000/items?item=test'
# Use: curl -X GET 'http://127.0.0.1:8000/items/1'
# Use: curl -X POST -H "Content-Type: application/json" -d '{"item": "test"}' 'http://127.0.0.1:8000/items'


'''
 Audio file lookup for frontend dropdown: GET /api/id/{audio_id}
 Returns a single audioFile model (id, label, type)

 This will be cleaned up later :3
'''

AUDIO_INDEX: dict[str, audioFile] = {
	"p000_453_wd1": audioFile(id="p000_453_wd1", label="p000_453_wd1.wav", type="word"),
	"p021_148_wd1": audioFile(id="p021_148_wd1", label="p021_148_wd1.wav", type="word"),
	"p028_058_wd1": audioFile(id="p028_058_wd1", label="p028_058_wd1.wav", type="word"),
	"p032_325_wi1": audioFile(id="p032_325_wi1", label="p032_325_wi1.wav", type="word"),
	"p036_423_wi1": audioFile(id="p036_423_wi1", label="p036_423_wi1.wav", type="word"),
	"p046_335_wp1": audioFile(id="p046_335_wp1", label="p046_335_wp1.wav", type="word"),
	"p053_315_wi1": audioFile(id="p053_315_wi1", label="p053_315_wi1.wav", type="word"),
	"p055_288_wp1": audioFile(id="p055_288_wp1", label="p055_288_wp1.wav", type="word"),
	"p091_115_wi1": audioFile(id="p091_115_wi1", label="p091_115_wi1.wav", type="word"),
	"p094_119_wp1": audioFile(id="p094_119_wp1", label="p094_119_wp1.wav", type="word"),
	"p004_215_pp1": audioFile(id="p004_215_pp1", label="p004_215_pp1.wav", type="phn"),
	"p005_250_pr1": audioFile(id="p005_250_pr1", label="p005_250_pr1.wav", type="phn"),
	"p020_374_pd1": audioFile(id="p020_374_pd1", label="p020_374_pd1.wav", type="phn"),
	"p021_132_pr1": audioFile(id="p021_132_pr1", label="p021_132_pr1.wav", type="phn"),
	"p036_103_pp1": audioFile(id="p036_103_pp1", label="p036_103_pp1.wav", type="phn"),
	"p053_359_pd1": audioFile(id="p053_359_pd1", label="p053_359_pd1.wav", type="phn"),
	"p062_008_pp1": audioFile(id="p062_008_pp1", label="p062_008_pp1.wav", type="phn"),
	"p094_496_pd1": audioFile(id="p094_496_pd1", label="p094_496_pd1.wav", type="phn"),
	"p102_367_pr1": audioFile(id="p102_367_pr1", label="p102_367_pr1.wav", type="phn"),
	"p105_160_ps1": audioFile(id="p105_160_ps1", label="p105_160_ps1.wav", type="phn"),
}

@app.get("/api/id/{audio_id}", response_model=audioFile)
def get_audio_file(audio_id: str) -> audioFile:
	item = AUDIO_INDEX.get(audio_id)
	if not item:
		raise HTTPException(status_code=404, detail="Audio file not found")
	return item

