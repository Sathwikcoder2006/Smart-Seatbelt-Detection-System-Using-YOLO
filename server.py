from flask import Flask, jsonify, Response
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import json
import time

app = Flask(__name__)
CORS(app)

model = YOLO("/Users/saisathwik/Desktop/Academics/Conceptual Project/seatbelt_detection/runs/first_run2/weights/best.pt")

VIDEO_PATH = "/Users/saisathwik/Desktop/Academics/Conceptual Project/seatbelt_detection/seatbelt_testing.mov"

FRAME_SKIP = 1  # Run detection every 1st frame (adjust for speed vs accuracy)


def generate_detections():
    """
    Opens the hardcoded video, runs YOLOv8 on every Nth frame,
    and streams results as Server-Sent Events.
    """
    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        yield f"data: {json.dumps({'error': 'Could not open video'})}\n\n"
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            yield f"data: {json.dumps({'status': 'ended'})}\n\n"
            break

        if frame_index % FRAME_SKIP == 0:
            results = model.predict(source=frame, conf=0.3, verbose=False)

            seatbelt_detected = False
            best_confidence = 0.0

            for r in results:
                for box in r.boxes:
                    class_id = int(box.cls[0])
                    class_name = model.names[class_id].lower()
                    confidence = float(box.conf[0])
                    if 'seatbelt' in class_name or 'belt' in class_name:
                        seatbelt_detected = True
                        best_confidence = max(best_confidence, confidence)

            payload = {
                "frame": frame_index,
                "seatbelt_detected": seatbelt_detected,
                "confidence": round(best_confidence, 3)
            }

            yield f"data: {json.dumps(payload)}\n\n"

            # Pace the stream to match video FPS
            time.sleep(FRAME_SKIP / fps)

        frame_index += 1

    cap.release()


@app.route('/detect-stream')
def detect_stream():
    return Response(
        generate_detections(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


@app.route('/detect-summary')
def detect_summary():
    """
    Alternative: process the whole video upfront and return a summary.
    Returns percentage of frames where seatbelt was detected.
    """
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        return jsonify({"error": "Could not open video"}), 500

    total_checked = 0
    seatbelt_frames = 0
    frame_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_index % FRAME_SKIP == 0:
            results = model.predict(source=frame, conf=0.3, verbose=False)
            total_checked += 1
            for r in results:
                for box in r.boxes:
                    class_id = int(box.cls[0])
                    class_name = model.names[class_id].lower()
                    if 'seatbelt' in class_name or 'belt' in class_name:
                        seatbelt_frames += 1
                        break
        frame_index += 1

    cap.release()

    pct = round((seatbelt_frames / total_checked * 100) if total_checked else 0, 1)
    return jsonify({
        "total_frames_checked": total_checked,
        "seatbelt_detected_frames": seatbelt_frames,
        "seatbelt_detected_percent": pct,
        "verdict": "SEATBELT ON" if pct >= 50 else "SEATBELT OFF"
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)