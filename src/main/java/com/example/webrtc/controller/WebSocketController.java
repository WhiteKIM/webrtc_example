package com.example.webrtc.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WebSocketController {

    @MessageMapping("/peer/offer/{camKey}/{roomId}")
    @SendTo("/broker/peer/offer/{camKey}/{roomId}")
    public String peerHandleOffer(
            @Payload String offer,
            @DestinationVariable(value = "roomId") String roomId,
            @DestinationVariable(value = "camKey") String camKey
    ){
        return offer;
    }

    @MessageMapping("/peer/iceCandidate/{camKey}/{roomId]")
    @SendTo("/broker/peer/iceCandidate/{camKey}/{roomId}")
    public String peerHandlingCandidate(
            @Payload String candidate,
            @DestinationVariable(value = "roomId") String roomId,
            @DestinationVariable(value = "camKey") String camKey
    ) {
        return candidate;
    }

    @MessageMapping("/peer/answer/{camKey}/{roomId}")
    @SendTo("/broker/peer/answer/{camKey}/{roomId}")
    public String peerHandlingAnswer(
            @Payload String answer,
            @DestinationVariable(value = "roomId") String roomId,
            @DestinationVariable(value = "camKey") String camKey
    ) {
        return answer;
    }

    @MessageMapping("/call/key")
    @SendTo("/broker/call/key")
    public String callKey(
            @Payload String message
    ) {
        return message;
    }

    @MessageMapping("/send/key")
    @SendTo("/topic/send/key")
    public String sendKey(
            @Payload String message
    ) {
        return message;
    }
}
