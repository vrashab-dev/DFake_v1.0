DeepFake Detection Web Application 🌐🎥
This project is a web-based application that uses TensorFlow.js to detect DeepFake content in both images and videos. The app leverages a pre-trained deep learning model to classify content as either "Real" or "DeepFake" with a simple and intuitive interface.

Features ✨
Image Detection: Upload an image, and the app will classify it as real or DeepFake.
Video Detection: Upload a video, and the app extracts frames to predict whether it contains DeepFake content.
Real-time Frame Analysis: Extracts frames from videos at intervals and predicts using the TensorFlow.js model.
Interactive UI: Visual feedback with color-coded results and shadow effects for easy understanding.
Memory Optimization: Proper use of TensorFlow.js methods like .dispose() to ensure efficient memory usage.
How It Works 🛠️
Load the Model:
A pre-trained TensorFlow.js model is loaded dynamically.
Preprocess Input:
Images are resized, normalized, and converted to tensors.
For videos, frames are extracted at specific intervals for analysis.
Prediction:
The model predicts whether the content is Real or DeepFake.
Results are displayed in real time with color-coded feedback.
Key Technologies 🚀
TensorFlow.js: For deep learning model integration and prediction.
JavaScript: Core logic for image/video preprocessing and user interactions.
HTML & CSS: Front-end interface for file uploads and displaying results.
