import React, { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

export default function Main() {
  const [localStream, setLocalStream] = useState(undefined);
  const [pcListMap, setPcListMap] = useState(new Map());
  const [roomId, setRoomId] = useState('');
  const [otherKeyList, setOtherKeyList] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const myKey = Math.random.toString(36).substring(2, 11);
  const [isView, setIsView] = useState(false);

  const startCam = async () => {
    try {
      if (navigator.mediaDevices !== undefined) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        console.log('Stream found');
        stream.getAudioTracks()[0].enabled = true;
        setLocalStream(stream);
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const connectSocket = async () => {
    const socket = new SockJS('/signaling');
    const client = Stomp.over(socket);
    client.debug = null;

    client.connect({}, () => {
      console.log('Connected to WebRTC server');

      stompClient.subscribe(`/topic/peer/iceCandidate/${myKey}/${roomId}`, (candidate) => {
        const key = JSON.parse(candidate.body).key;
        const message = JSON.parse(candidate.body).body;

        pcListMap.get(key).addIceCandidate(
          new RTCIceCandidate({
            candidate: message.candidate,
            sdpMLineIndex: message.sdpMLineIndex,
            sdpMid: message.sdpMid,
          })
        );
      });

      stompClient.subscribe(`/topic/peer/offer/${myKey}/${roomId}`, (offer) => {
        const key = JSON.parse(offer.body).key;
        const message = JSON.parse(offer.body).body;

        pcListMap.set(key, createPeerConnection(key));
        pcListMap.get(key).setRemoteDescription(
          new RTCSessionDescription({
            type: message.type,
            sdp: message.sdp,
          })
        );
        sendAnswer(pcListMap.get(key), key);
      });

      stompClient.subscribe(`/topic/peer/answer/${myKey}/${roomId}`, (answer) => {
        const key = JSON.parse(answer.body).key;
        const message = JSON.parse(answer.body).body;

        pcListMap.get(key).setRemoteDescription(new RTCSessionDescription(message));
      });

      stompClient.subscribe(`/topic/call/key`, (message) => {
        stompClient.send(`/app/send/key`, {}, JSON.stringify(myKey));
      });

      stompClient.subscribe(`/topic/send/key`, (message) => {
        const key = JSON.parse(message.body);
        if (myKey !== key && !otherKeyList.includes(key)) {
          otherKeyList.push(key);
        }
      });

      setStompClient(client);
    });
  };

  const onTrack = (event, otherKey) => {
    if (document.getElementById(`${otherKey}`) === null) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.controls = true;
      video.id = otherKey;
      video.srcObject = event.streams[0];
      document.getElementById('remoteStreamDiv').appendChild(video);
    }
  };

  const createPeerConnection = (otherKey) => {
    const pc = new RTCPeerConnection();
    try {
      pc.addEventListener('icecandidate', (event) => onIceCandidate(event, otherKey));
      pc.addEventListener('track', (event) => onTrack(event, otherKey));
      if (localStream !== undefined) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }
      console.log('PeerConnection created');
    } catch (error) {
      console.error('PeerConnection failed: ', error);
    }
    return pc;
  };

  const onIceCandidate = (event, otherKey) => {
    if (event.candidate) {
      console.log('ICE candidate');
      stompClient.send(
        `/app/peer/iceCandidate/${otherKey}/${roomId}`,
        {},
        JSON.stringify({
          key: myKey,
          body: event.candidate,
        })
      );
    }
  };

  const sendOffer = (pc, otherKey) => {
    pc.createOffer().then((offer) => {
      setLocalAndSendMessage(pc, offer);
      stompClient.send(
        `/app/peer/offer/${otherKey}/${roomId}`,
        {},
        JSON.stringify({
          key: myKey,
          body: offer,
        })
      );
      console.log('Send offer');
    });
  };

  const sendAnswer = (pc, otherKey) => {
    pc.createAnswer().then((answer) => {
      setLocalAndSendMessage(pc, answer);
      stompClient.send(
        `/app/peer/answer/${otherKey}/${roomId}`,
        {},
        JSON.stringify({
          key: myKey,
          body: answer,
        })
      );
      console.log('Send answer');
    });
  };

  const setLocalAndSendMessage = (pc, sessionDescription) => {
    pc.setLocalDescription(sessionDescription);
  };

  useEffect(() => {
    // Clean up stompClient on component unmount
    return () => {
      if (stompClient) {
        stompClient.disconnect();
      }
    };
  }, [stompClient]);

  const handleEnterRoomClick = async () => {
    await startCam();

    if (localStream !== undefined) {
      document.querySelector('#localStream').style.display = 'block';
      document.querySelector('#startSteamBtn').style.display = '';
    }

    setRoomId(document.querySelector('#roomIdInput').value);
    document.querySelector('#roomIdInput').disabled = true;
    document.querySelector('#enterRoomBtn').disabled = true;

    await connectSocket();
  };

  const handleStartStreamClick = async () => {
    await stompClient.send(`/app/call/key`, {}, {});

    setTimeout(() => {
      otherKeyList.forEach((key) => {
        if (!pcListMap.has(key)) {
          const pc = createPeerConnection(key);
          setPcListMap((prevMap) => new Map(prevMap).set(key, pc));
          sendOffer(pcListMap.get(key), key);
        }
      });
    }, 1000);
  };

  return (
    <>
      <div>
        <input type="number" id="roomIdInput"></input>
        <button id="enterRoomBtn" onClick={handleEnterRoomClick}>
          Enter RoomId
        </button>
        <button id="startSteamBtn" onClick={handleStartStreamClick} style={{ display: 'none' }}>
          Start Streaming
        </button>
      </div>
      <div>
        <video id="localStream" autoPlay playsInline controls style={{ display: 'none' }} ref={(ref) => (ref.srcObject = localStream)}></video>
      </div>
      <div id="remoteStreamDiv"></div>
    </>
  );
}
