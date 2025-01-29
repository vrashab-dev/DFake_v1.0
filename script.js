let loadedModel = null; // Define the loadedModel globally
let processing = false; // Global flag to track ongoing processing
const outputBox = document.getElementById("result-container");
const resultDiv = document.getElementById("result");
let modelLoaded = false;
// Function to load the model
async function loadModel() {
  console.log("Checking if model is already loaded...");
  // Check if the model is already loaded
  if (loadedModel) {
    console.log("Model already loaded:", loadedModel);
    modelLoaded = true;
    return loadedModel; // Return the already loaded model
  }

  try {
    console.log("Loading model...");
    loadedModel = await tf.loadLayersModel(
      "https://raw.githubusercontent.com/vrashab-dev/dfake_model/main/model/model.json"
    );
    console.log("Model loaded:", loadedModel);

    // Check if the model has inputs, and if not, add a new input layer
    if (!loadedModel.inputs || loadedModel.inputs.length === 0) {
      const inputLayer = tf.input({ shape: [256, 256, 3] });
      const model = tf.model({
        inputs: inputLayer,
        outputs: loadedModel.output,
      });
      loadedModel = model;
      console.log("Input layer added to model.");
    }
    return loadedModel;
  } catch (error) {
    console.error("Error loading model:", error);
    alert("Failed to load the model. Please check your connection.");
    throw error;
  }
}
const model = await loadModel();

// Function to preprocess an image (for both photo and video frames)
function preprocessImage(imgElement, targetSize = [256, 256]) {
  console.log("Preprocessing image...");
  return tf.tidy(() => {
    return tf.browser
      .fromPixels(imgElement)
      .resizeBilinear(targetSize) // Resize only the 2D dimensions (height, width)
      .toFloat()
      .div(tf.scalar(255.0)) // Normalize image data to [0, 1]
      .expandDims(0); // Add batch dimension
  });
}

async function predictImage(model, imgElement) {
  console.log("Predicting image...");
  const processedImage = preprocessImage(imgElement);
  let predictions;
  try {
    predictions = model.predict(processedImage);
    const result = await predictions.data();
    console.log("Prediction result:", result);

    // Return the classification result based on the threshold (>= 0.8 is "Real", < 0.8 is "DeepFake")
    return result[0] >= 0.75 ? "Real" : "DeepFake";
  } finally {
    processedImage.dispose(); // Free memory for the processed image
    predictions?.dispose(); // Free memory for the prediction
  }
}

function extractFramesFromVideo(videoElement, interval = 2) {
  videoElement
    .play()
    .then(() => {
      console.log("Video started playing.");
    })
    .catch((error) => {
      console.error("Error starting video:", error);
    });
  return new Promise((resolve, reject) => {
    const frames = [];

    videoElement
      .play()
      .then(() => {
        console.log("Video started playing.");
      })
      .catch((error) => {
        console.error("Error starting video:", error);
      });

    // Check if the video is loaded and has metadata
    videoElement.addEventListener("loadedmetadata", () => {
      console.log(
        "Video metadata loaded: ",
        videoElement.videoWidth,
        videoElement.videoHeight
      );
    });

    // Listen for when the video is ready to play
    videoElement.addEventListener("play", function captureFrame() {
      console.log("Video play event triggered...");

      const captureInterval = setInterval(() => {
        console.log(
          "Checking video status... Is paused? ",
          videoElement.paused
        );

        if (videoElement.paused || videoElement.ended) {
          console.log("Video paused or ended.");
          clearInterval(captureInterval);
          resolve(frames);
          console.log("Frames captured:", frames.length);
        } else {
          const canvas = document.createElement("canvas");
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          const context = canvas.getContext("2d");
          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          frames.push(canvas); // Push the frame to the frames array
          console.log("Frame captured, total frames:", frames.length);
        }
      }, interval * 1000); // Capture a frame every 'interval' seconds
    });

    // If the video encounters an error, log and reject the promise
    videoElement.onerror = (error) => {
      console.error("Error during video playback:", error);
      reject(new Error("Error during video playback"));
    };
  });
}

// Function to calculate the prediction with a minimum of 5 frames being classified as deepfake
async function predictVideo(model, videoElement) {
  console.log("Starting video prediction...");
  const frames = await extractFramesFromVideo(videoElement, 1); // Extract frames every 2 seconds
  let deepfakeCount = 0;
  const deepfakeThreshold = 0.6; // If prediction is <= 0.8, classify as deepfake

  console.log("Total frames extracted:", frames.length);

  // Loop through frames and check if they meet the deepfake threshold
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const prediction = await predictImage(model, frame);
    console.log(`Frame ${i}: Prediction = ${prediction}`);

    // If the frame is classified as deepfake (prediction < 0.8), increment count
    if (prediction === "DeepFake") {
      deepfakeCount++;
    }

    // If 3 frames are already classified as deepfake, return true (deepfake)
    if (deepfakeCount >= 2) {
      console.log("Deepfake detected. Returning true.");
      return "DeepFake"; // Return "DeepFake" if video is classified as deepfake
    }
  }

  // If fewer than 3 frames are classified as deepfake, classify the video as real
  console.log("Not enough frames classified as deepfake. Returning real.");
  return "Real"; // Return "Real" if video is classified as real
}

document.getElementById("detectButton").addEventListener("click", async () => {
  resultDiv.style.color = "green"
  outputBox.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.5)";
  const fileInput = document.getElementById("upload");
  const videoElement = document.getElementById("videoPreview");
  const imageElement = document.getElementById("canvasId");
 
  const file = fileInput.files[0];

  // If there's ongoing processing, stop it
  if (processing) {
    console.log("Stopping previous process...");
    videoElement.pause(); // Stop video playback
    videoElement.src = ""; // Clear video source
    resultDiv.innerText = ""; // Clear previous result
    processing = false; // Reset the processing flag
    return;
  }

  if (!file) {
    alert("Please upload an image or video file.");
    return;
  }

  const fileType = file.type.split("/")[0]; // Determine if it's an image or video
  processing = true; // Set processing flag to true

  if (fileType === "video") {

    if(loadModel){
    // Hide the image and show the video element
    imageElement.style.display = "none";
    videoElement.style.display = "block";

    videoElement.src = URL.createObjectURL(file); // Set the video source
    videoElement.loop = false; // Optional: no looping
    resultDiv.innerText = "Processing video...";

    try {
      // Wait for the video to load and start playing
      await new Promise((resolve, reject) => {
        videoElement.oncanplay = resolve;
        videoElement.onerror = () => reject(new Error("Failed to load video."));
      });

      // Load the model and process the video
      
      const result = await predictVideo(model, videoElement);

      // Display prediction result
      resultDiv.innerText = `Prediction: ${result}`;
      resultDiv.style.color = result === "DeepFake" ? "red" : "green";
      outputBox.style.boxShadow =
        result === "DeepFake"
          ? "0 0 20px rgba(255, 0, 0, 0.85)"
          : "0 0 20px rgba(0, 255, 0, 0.5)";
    } catch (error) {
      console.error("Error during video processing:", error);
      resultDiv.innerText = "Error processing video. Please try again.";
    } finally {
      // Clean up
      processing = false;
      URL.revokeObjectURL(videoElement.src);
    }
  }else{

  }
  } else if (fileType === "image") {
    // Hide the video and show the image element
    videoElement.style.display = "none";
    imageElement.style.display = "block";

    imageElement.src = URL.createObjectURL(file);
    resultDiv.innerText = "Processing image...";

    try {
      await new Promise((resolve, reject) => {
        imageElement.onload = resolve;
        imageElement.onerror = () => reject(new Error("Failed to load image."));
      });

      // Load the model and process the image
    
      const result = await predictImage(model, imageElement);

      // Display prediction result
      resultDiv.innerText = `Prediction: ${result}`;
      resultDiv.style.color = result === "DeepFake" ? "red" : "green";
      outputBox.style.boxShadow =
        result === "DeepFake"
          ? "0 0 20px rgba(255, 0, 0, 0.85)"
          : "0 0 20px rgba(0, 255, 0, 0.5)";
    } catch (error) {
      console.error("Error during image processing:", error);
      resultDiv.innerText = "Error processing image. Please try again.";
    } finally {
      // Clean up
      processing = false;
      URL.revokeObjectURL(imageElement.src);
    }
  }
});
