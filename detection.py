from ultralytics import YOLO

model = YOLO("/Users/saisathwik/Desktop/Academics/Conceptual Project/seatbelt_detection/runs/first_run2/weights/best.pt")

# Predict
results = model.predict(
    source="/Users/saisathwik/Desktop/Academics/Conceptual Project/seatbelt_detection/seatbelt_testing.mov",
    show=True,
    conf=0.3
)

for r in results:
    r.print()