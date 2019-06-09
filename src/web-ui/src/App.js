import React, { useRef, useState } from "react";
import { findDOMNode } from "react-dom";
import Webcam from "react-webcam";
import { Col, Grid, Row } from "react-bootstrap";

import CameraHelp from "./components/CameraHelp";
import EngagementSummary from "./components/EngagementsSummary";
import Header from "./components/Header";

import faceDetailsMapper from "./utils/faceDetailsMapper";
import getChartData from "./utils/getChartData";
import gateway from "./utils/gateway";

export default () => {
  const [aggregate, setAggregate] = useState({
    angry: 0,
    calm: 0,
    happy: 0,
    sad: 0,
    surprised: 0
  });

  const [detectedFaces, setDetectedFaces] = useState([]);
  const [detectedPeople, setDetectedPeople] = useState([]);
  const [happyometer, setHappyometer] = useState(50);
  const [readyToStream, setReadyToStream] = useState(false);
  const [webcamCoordinates, setWebcamCoordinates] = useState({});

  const iterating = useRef(false);
  const people = useRef([]);
  const webcam = useRef(undefined);

  const addUser = params => gateway.addUser(params);

  const getSnapshot = () => {
    setWebcamCoordinates(findDOMNode(webcam.current).getBoundingClientRect());

    const image = webcam.current.getScreenshot();
    const b64Encoded = image.split(",")[1];

    gateway.getEngagement().then(response => {
      const chartData = getChartData(response);

      if (chartData.happyometer) {
        setHappyometer(chartData.happyometer);
      }

      if (chartData.aggregate) {
        setAggregate(chartData.aggregate);
      }
    });

    gateway.detectFaces(b64Encoded).then(response => {
      const detectedFaces = response.FaceDetails.map(person => {
        const result = faceDetailsMapper(person);
        gateway.postEngagement(result).then(() => {});
        return result;
      });
      setDetectedFaces(detectedFaces);

      if (iterating.current) {
        setTimeout(getSnapshot, 300);
      }
    });
    this.speaker = new SpeechSynthesisUtterance();
    this.speaker.lang = 'en-US';
    this.speaker.text = 'Your balance is negative. Please refill your account as soon as possible.';
    gateway.searchFaces(b64Encoded).then(response => {
      const detectedPeople = [];
      if (response.FaceMatches) {
        response.FaceMatches.forEach(match => {
          const externalImageId = match.Face.ExternalImageId;
          const detected_person = people.current.find(x => x.externalImageId === externalImageId)
          speechSynthesis.speak(this.speaker);
          detectedPeople.push(detected_person);
        });
      }
      setDetectedPeople(detectedPeople);
    });
  };

  const setupWebcam = instance => {
    webcam.current = instance;

    const checkIfReady = () => {
      if (
        webcam.current &&
        webcam.current.state &&
        webcam.current.state.hasUserMedia
      ) {
        setReadyToStream(true);
      } else setTimeout(checkIfReady, 250);
    };

    checkIfReady();
  };

  const toggleRekognition = () => {
    iterating.current = !iterating.current;

    if (iterating.current) {
      gateway.getPeople().then(response => {
        people.current = response.people;
        getSnapshot();
      });
    }
  };

  return (
    <div className="App">
      <Header
        toggleRekognition={toggleRekognition}
        addUser={addUser}
        readyToStream={readyToStream}
      />
      <Grid>
        <CameraHelp show={!readyToStream} />
        <Row>
          <Col md={8} sm={6}>
            <Grid>
              <Row>
                <Col md={8} sm={6}>
                  <Webcam
                    ref={setupWebcam}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      width: 1280,
                      height: 640,
                      facingMode: "user"
                    }}
                    width="100%"
                    height="100%"
                  />
                </Col>
                <Col md={4} sm={6}>
                  <EngagementSummary
                    detectedFaces={detectedFaces}
                    detectedPeople={detectedPeople}
                    webcamCoordinates={webcamCoordinates}
                  />
                </Col>
              </Row>
            </Grid>
          </Col>
        </Row>
      </Grid>
    </div>
  );
};
