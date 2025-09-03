#!/usr/bin/env python3

import argparse
import os
import sys
from typing import Tuple

import numpy as np
import pandas as pd
import librosa
from tqdm import tqdm

from datasets import Dataset, DatasetDict
# Disable torchvision import inside transformers to avoid optional dependency issues
os.environ["TRANSFORMERS_NO_TORCHVISION"] = "1"
from transformers import WhisperProcessor, WhisperTokenizer, WhisperForConditionalGeneration
from safetensors.torch import load_file
import torch


def load_audio_data(file_path: str) -> Tuple[np.ndarray, int]:
	"""Load audio preserving original sampling rate."""
	audio_array, sampling_rate = librosa.load(file_path, sr=None)
	return audio_array, sampling_rate


def _resolve_audio_path(csv_dir: str, audio_path: str) -> str:
	"""Resolve audio_path against likely locations.
	Order:
	1) Absolute path as-is
	2) csv_dir + audio_path
	3) If audio_path starts with 'testingset/', try csv_dir + stripped
	4) project_root + audio_path
	5) project_root + stripped (if applicable)
	"""
	if os.path.isabs(audio_path) and os.path.exists(audio_path):
		return audio_path

	project_root = os.path.dirname(csv_dir)
	# 2) csv_dir + audio_path
	cand = os.path.normpath(os.path.join(csv_dir, audio_path))
	if os.path.exists(cand):
		return cand

	# 3) strip leading 'testingset/' when CSV sits inside that folder
	prefix = 'testingset/'
	if audio_path.startswith(prefix):
		stripped = audio_path[len(prefix):]
		cand2 = os.path.normpath(os.path.join(csv_dir, stripped))
		if os.path.exists(cand2):
			return cand2

	# 4) project_root + audio_path
	cand3 = os.path.normpath(os.path.join(project_root, audio_path))
	if os.path.exists(cand3):
		return cand3

	# 5) project_root + stripped
	if audio_path.startswith(prefix):
		cand4 = os.path.normpath(os.path.join(project_root, stripped))
		if os.path.exists(cand4):
			return cand4

	# Fallback: return original (will fail later with clear error)
	return audio_path


def create_dataset(csv_file: str) -> DatasetDict:
	"""Create a Hugging Face DatasetDict from a CSV with columns: audio_path,label.
	Resolves relative paths against the CSV's directory.
	"""
	df = pd.read_csv(csv_file)
	csv_dir = os.path.dirname(os.path.abspath(csv_file))

	processed_data = []
	for _, row in tqdm(df.iterrows(), total=df.shape[0], desc="Processing audio files"):
		audio_path = str(row['audio_path'])
		label = row['label']
		resolved_path = _resolve_audio_path(csv_dir, audio_path)
		if not os.path.exists(resolved_path):
			raise FileNotFoundError(f"Audio not found after resolution: {audio_path} -> {resolved_path}")
		# Load audio
		audio_array, sampling_rate = load_audio_data(resolved_path)

		item = {
			'audio': {
				'path': resolved_path,
				'array': audio_array,
				'sampling_rate': sampling_rate
			},
			'sentence': label
		}
		processed_data.append(item)

	dataset = Dataset.from_pandas(pd.DataFrame(processed_data))
	train_dataset, test_dataset = dataset.train_test_split(test_size=0.05).values()

	return DatasetDict({
		'train': train_dataset,
		'test': test_dataset
	})


def main():
	parser = argparse.ArgumentParser(description="TbDD inference script (token-based dysfluency detection)")
	parser.add_argument('--level', type=str, default='word', choices=['word', 'phn'], help='Dysfluency token level')
	parser.add_argument('--csv', type=str, default=None, help='Path to CSV (defaults to testingset/<level>.csv)')
	parser.add_argument('--ckpt', type=str, default=None, help='Path to safetensors checkpoint (defaults to pretrained/TbDD_<level>.safetensors)')
	parser.add_argument('--sample_index', type=int, default=1, help='Index into train split to preview')
	parser.add_argument('--audio', type=str, default=None, help='Path to a single audio file to transcribe')
	parser.add_argument('--label', type=str, default='', help='Optional label/ground-truth text for single audio testing')
	args = parser.parse_args()

	level = args.level
	csv_file = args.csv or f'testingset/{level}.csv'
	ckpt_path = args.ckpt or f'pretrained/TbDD_{level}.safetensors'

	if not os.path.exists(ckpt_path):
		print(f"Checkpoint not found: {ckpt_path}", file=sys.stderr)
		print("Expected a safetensors file exported from the TbDD project.", file=sys.stderr)
		sys.exit(1)

	# Build dataset from CSV or single audio
	if args.audio:
		if not os.path.exists(args.audio):
			print(f"Audio file not found: {args.audio}", file=sys.stderr)
			sys.exit(1)
		print('Loading single audio...')
		audio_array, sampling_rate = load_audio_data(args.audio)
		processed_data = [{
			'audio': {
				'path': os.path.abspath(args.audio),
				'array': audio_array,
				'sampling_rate': sampling_rate
			},
			'sentence': args.label or ''
		}]
		dataset = DatasetDict({
			'train': Dataset.from_pandas(pd.DataFrame(processed_data)),
			'test': Dataset.from_pandas(pd.DataFrame([]))
		})
	else:
		if not os.path.exists(csv_file):
			print(f"CSV not found: {csv_file}", file=sys.stderr)
			sys.exit(1)
		print('Loading dataset...')
		dataset = create_dataset(csv_file)
		print(dataset)

	# Pick sample
	idx = 0 if args.audio else max(0, min(args.sample_index, len(dataset['train']) - 1))
	audio_sample = dataset['train'][idx]['audio']
	text = dataset['train'][idx].get('sentence', '')
	if text:
		print('\nGround truth sentence:')
		print(text)

	# Whisper components
	processor = WhisperProcessor.from_pretrained("openai/whisper-large")
	tokenizer = WhisperTokenizer.from_pretrained("openai/whisper-large", language="en", task="transcribe")
	model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-small")

	# TbDD tokens
	if level == 'word':
		new_tokens = ["[REP]", "[DEL]", "[PAU]", "[INS]"]
	else:
		new_tokens = ["[REP]", "[DEL]", "[PRO]", "[SUB]", "jh", "dh"]

	# Extend tokenizer and resize model embeddings
	tokenizer.add_tokens(list(new_tokens))
	model.resize_token_embeddings(len(tokenizer))

	print('\nLoading model weights...')
	state_dict = load_file(ckpt_path)
	missing_unexpected = model.load_state_dict(state_dict, strict=False)
	print(missing_unexpected)

	# Prepare input features
	input_features = processor(
		audio_sample["array"], sampling_rate=audio_sample["sampling_rate"], return_tensors="pt"
	).input_features

	# Move to device
	device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
	model = model.to(device)
	input_features = input_features.to(device)

	# Generate (language forced to English)
	with torch.no_grad():
		predicted_ids = model.generate(input_features, language='en')
	print('\nPredicted token IDs:')
	print(predicted_ids)

	# Decode
	transcription = tokenizer.decode(predicted_ids[0], skip_special_tokens=True)
	print('\nDecoded transcription:')
	print(transcription)


if __name__ == '__main__':
	main() 