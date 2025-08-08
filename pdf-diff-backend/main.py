import fitz  # PyMuPDF
import Levenshtein
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple, Dict
import tempfile
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Updated Data Models ---
class Difference(BaseModel):
    page_index: int
    type: str
    bbox_a: Optional[List[float]] = None
    bbox_b: Optional[List[float]] = None
    text_a: Optional[str] = None
    text_b: Optional[str] = None
    absolute_y_a: Optional[float] = None
    absolute_y_b: Optional[float] = None

class DocumentInfo(BaseModel):
    total_height: float

class ComparisonResponse(BaseModel):
    document_info: Dict[str, DocumentInfo]
    differences: List[Difference]

# --- Bounding Box Merging Logic (remains the same) ---
def boxes_intersect(box1: List[float], box2: List[float], margin: int = 50) -> bool:
    b1_x0, b1_y0, b1_x1, b1_y1 = box1[0] - margin, box1[1] - margin, box1[2] + margin, box1[3] + margin
    b2_x0, b2_y0, b2_x1, b2_y1 = box2[0] - margin, box2[1] - margin, box2[2] + margin, box2[3] + margin
    return not (b1_x1 < b2_x0 or b2_x1 < b1_x0 or b1_y1 < b2_y0 or b2_y1 < b1_y0)

def merge_boxes(box1: List[float], box2: List[float]) -> List[float]:
    return [
        min(box1[0], box2[0]),
        min(box1[1], box2[1]),
        max(box1[2], box2[2]),
        max(box1[3], box2[3]),
    ]

def merge_differences_iterative(differences: List[Difference]) -> List[Difference]:
    if not differences:
        return []

    grouped_diffs = {}
    for diff in differences:
        key = (diff.page_index, diff.type)
        if key not in grouped_diffs:
            grouped_diffs[key] = []
        grouped_diffs[key].append(diff)

    final_merged_diffs = []
    for key, group in grouped_diffs.items():
        while True:
            merged_in_pass = False
            i = 0
            while i < len(group):
                j = i + 1
                while j < len(group):
                    diff1 = group[i]
                    diff2 = group[j]
                    
                    bbox1 = diff1.bbox_a or diff1.bbox_b
                    bbox2 = diff2.bbox_a or diff2.bbox_b

                    if boxes_intersect(bbox1, bbox2):
                        # Merge diff2 into diff1
                        merged_bbox_a = None
                        if diff1.bbox_a or diff2.bbox_a:
                            merged_bbox_a = merge_boxes(diff1.bbox_a or [], diff2.bbox_a or []) if diff1.bbox_a and diff2.bbox_a else (diff1.bbox_a or diff2.bbox_a)
                        
                        merged_bbox_b = None
                        if diff1.bbox_b or diff2.bbox_b:
                            merged_bbox_b = merge_boxes(diff1.bbox_b or [], diff2.bbox_b or []) if diff1.bbox_b and diff2.bbox_b else (diff1.bbox_b or diff2.bbox_b)

                        # Calculate merged absolute_y_a and absolute_y_b
                        merged_abs_y_a = None
                        if diff1.absolute_y_a is not None and diff2.absolute_y_a is not None:
                            merged_abs_y_a = min(diff1.absolute_y_a, diff2.absolute_y_a)
                        elif diff1.absolute_y_a is not None: merged_abs_y_a = diff1.absolute_y_a
                        elif diff2.absolute_y_a is not None: merged_abs_y_a = diff2.absolute_y_a

                        merged_abs_y_b = None
                        if diff1.absolute_y_b is not None and diff2.absolute_y_b is not None:
                            merged_abs_y_b = min(diff1.absolute_y_b, diff2.absolute_y_b)
                        elif diff1.absolute_y_b is not None: merged_abs_y_b = diff1.absolute_y_b
                        elif diff2.absolute_y_b is not None: merged_abs_y_b = diff2.absolute_y_b

                        group[i] = Difference(
                            page_index=diff1.page_index, type=diff1.type,
                            bbox_a=merged_bbox_a, bbox_b=merged_bbox_b,
                            text_a=((diff1.text_a or "") + " " + (diff2.text_a or "")).strip(),
                            text_b=((diff1.text_b or "") + " " + (diff2.text_b or "")).strip(),
                            absolute_y_a=merged_abs_y_a,
                            absolute_y_b=merged_abs_y_b
                        )
                        group.pop(j)
                        merged_in_pass = True
                        j = i + 1 
                    else:
                        j += 1
                i += 1
            
            if not merged_in_pass:
                break
        final_merged_diffs.extend(group)

    return final_merged_diffs

# --- Core Comparison Logic ---
def find_best_match(block_a, blocks_b, y_threshold=10, overlap_threshold=0.5, text_similarity_threshold=0.7):
    ax0, ay0, ax1, ay1, a_text, _, _ = block_a
    best_match = None
    best_score = -1 # Use a score that combines text similarity and positional closeness

    for block_b in blocks_b:
        bx0, by0, bx1, by1, b_text, _, _ = block_b
        
        # Calculate text similarity
        ratio = Levenshtein.ratio(a_text.strip(), b_text.strip())

        # Calculate positional difference
        y_diff = abs(ay0 - by0)
        overlap_x = max(0, min(ax1, bx1) - max(ax0, bx0))
        
        # Check if text is similar enough AND positional criteria are met
        if ratio >= text_similarity_threshold and \
           y_diff <= y_threshold and \
           (overlap_x / (ax1 - ax0) > overlap_threshold or overlap_x / (bx1 - bx0) > overlap_threshold):
            
            # Combine ratio and inverse y_diff for a score (higher is better)
            # You might need to tune this scoring function
            score = ratio - (y_diff / 100.0) # Penalize larger y_diff
            
            if score > best_score:
                best_score = score
                best_match = block_b
                
    return best_match

def compare_pdfs(file_path1: str, file_path2: str) -> ComparisonResponse:
    doc_a, doc_b = fitz.open(file_path1), fitz.open(file_path2)
    page_heights_a = [p.rect.height for p in doc_a]
    page_heights_b = [p.rect.height for p in doc_b]
    total_height_a = sum(page_heights_a)
    total_height_b = sum(page_heights_b)
    
    raw_differences = []
    num_pages = max(len(doc_a), len(doc_b))
    for i in range(num_pages):
        offset_a = sum(page_heights_a[:i])
        offset_b = sum(page_heights_b[:i])
        blocks_a = doc_a[i].get_text("blocks") if i < len(doc_a) else []
        blocks_b = doc_b[i].get_text("blocks") if i < len(doc_b) else []
        unmatched_b = list(blocks_b)

        for block_a in blocks_a:
            best_match_b = find_best_match(block_a, unmatched_b, text_similarity_threshold=0.7)
            bbox_a_list = list(block_a[:4])
            text_a = block_a[4].strip()

            if best_match_b:
                unmatched_b.remove(best_match_b)
                bbox_b_list = list(best_match_b[:4])
                text_b = best_match_b[4].strip()

                if Levenshtein.ratio(text_a, text_b) < 0.999: # Increased sensitivity for modification
                    if text_a or text_b: # Only add if there's actual text content
                        raw_differences.append(Difference(
                            page_index=i, type="modification", bbox_a=bbox_a_list, bbox_b=bbox_b_list,
                            text_a=text_a, text_b=text_b,
                            absolute_y_a=offset_a + bbox_a_list[1], absolute_y_b=offset_b + bbox_b_list[1]
                        ))
            else:
                if text_a: # Only add if there's actual text content
                    raw_differences.append(Difference(
                        page_index=i, type="deletion", bbox_a=bbox_a_list, text_a=text_a,
                        absolute_y_a=offset_a + bbox_a_list[1]
                    ))
        for block_b in unmatched_b:
            bbox_b_list = list(block_b[:4])
            text_b = block_b[4].strip()
            if text_b: # Only add if there's actual text content
                raw_differences.append(Difference(
                    page_index=i, type="addition", bbox_b=bbox_b_list, text_b=text_b,
                    absolute_y_b=offset_b + bbox_b_list[1]
                ))
            
    merged_diffs = merge_differences_iterative(raw_differences)
    return ComparisonResponse(
        document_info={"a": {"total_height": total_height_a}, "b": {"total_height": total_height_b}},
        differences=merged_diffs
    )

# --- FastAPI Endpoint ---
@app.post("/compare", response_model=ComparisonResponse)
async def compare_documents(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp1, \
         tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp2:
        try:
            tmp1.write(await file1.read())
            tmp2.write(await file2.read())
            tmp1.flush()
            tmp2.flush()
            report = compare_pdfs(tmp1.name, tmp2.name)
            return report
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
        finally:
            os.unlink(tmp1.name)
            os.unlink(tmp2.name)

@app.get("/")
def read_root():
    return {"message": "PDF Difference Checker Backend is running."}