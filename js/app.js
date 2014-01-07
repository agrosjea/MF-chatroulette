// Generated by CoffeeScript 1.6.3
var MainCtrl, app;

app = angular.module('app', []);

app.config([
  '$sceProvider', function($sceProvider) {
    return $sceProvider.enabled(false);
  }
]);

app.factory('settings', function() {
  return {
    sockUrl: 'http://172.245.60.168:8080/controller',
    gumConf: {
      audio: true,
      video: {
        mandatory: {
          minWidth: 640,
          maxWidth: 640,
          minHeight: 480,
          maxHeight: 480
        }
      }
    },
    peerConf: {
      iceServers: [
        {
          url: 'stun:stun.l.google.com:19302'
        }
      ]
    }
  };
});

app.factory('moment', function() {
  return moment;
});

app.factory('sockjs', function($rootScope) {
  var sockjs;
  sockjs = {};
  sockjs.newSocket = function(url) {
    var socket;
    socket = new SockJS(url);
    socket.onopen = function() {
      return $rootScope.$apply(function() {
        return $rootScope.$broadcast('sockjs:open');
      });
    };
    socket.onmessage = function(e) {
      return $rootScope.$apply(function() {
        return $rootScope.$broadcast('sockjs:message', e.data);
      });
    };
    socket.onerror = function(e) {
      return $rootScope.$apply(function() {
        return $rootScope.$broadcast('sockjs:error', e.data);
      });
    };
    socket.onclose = function() {
      return $rootScope.$apply(function() {
        return $rootScope.$broadcast('sockjs:close');
      });
    };
    sockjs.socket = socket;
    return sockjs.sendJSON = function(data) {
      return socket.send(JSON.stringify(data));
    };
  };
  $rootScope.$on('sockjs:message', function(e, data) {
    data = JSON.parse(data);
    if (data.type != null) {
      return $rootScope.$broadcast("sockjs:" + data.type, data);
    }
  });
  return sockjs;
});

app.directive('scrollBottom', function($timeout) {
  return function(scope, element, attrs) {
    return scope.$watch('messages.length', function() {
      return $timeout(function() {
        return element.animate({
          scrollTop: element.prop("scrollHeight")
        }, 'fast');
      }, 10);
    });
  };
});

MainCtrl = function($rootScope, $scope, $timeout, settings, moment, sockjs) {
  var dtNow;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    $scope.isMobile = true;
    return;
  }
  if (!getUserMedia) {
    $scope.noWebRTC = true;
    return;
  }
  dtNow = function() {
    return "[" + (moment().format('MM/DD/YYYY hh:mm A')) + "]";
  };
  $scope.supported = true;
  $scope.connected = false;
  $scope.waiting = true;
  $scope.messages = [];
  return getUserMedia({
    audio: true,
    video: true
  }, function(stream) {
    var conn;
    attachMediaStream($('#local-video')[0], stream);
    $scope.toggleLocalStream = function(type) {
      var t, tracks, _i, _len, _results;
      tracks = null;
      if (type === 'audio') {
        tracks = stream.getAudioTracks();
      } else {
        tracks = stream.getVideoTracks();
      }
      _results = [];
      for (_i = 0, _len = tracks.length; _i < _len; _i++) {
        t = tracks[_i];
        _results.push(t.enabled = !t.enabled);
      }
      return _results;
    };
    conn = null;
    $rootScope.$on('sockjs:open', function() {
      $scope.connected = true;
      $scope.messages.push("<span class='blue'>" + (dtNow()) + " Connection to server established.</span>");
      $scope.messages.push("<span class='blue'>" + (dtNow()) + " Waiting for a partner...</span>");
      $scope.closeConnection = function() {
        try {
          conn.close();
          console.log("Closed existing RTCPeerConnection");
        } catch (_error) {
          console.log("RTCPeerConnection already closed");
        }
        return $scope.waiting = true;
      };
      $scope.newConnection = function() {
        $scope.waiting = true;
        conn = new RTCPeerConnection(settings.peerConf);
        conn.addStream(stream);
        conn.onicecandidate = function(e) {
          return $scope.$apply(function() {
            console.log("onicecandidate triggered");
            if (e.candidate) {
              return sockjs.sendJSON({
                type: 'candidate',
                candidate: e.candidate
              });
            }
          });
        };
        conn.onaddstream = function(e) {
          return $scope.$apply(function() {
            console.log("Attaching remote stream");
            attachMediaStream($('#remote-video')[0], e.stream);
            $scope.waiting = false;
            return $scope.messages.push("<span class='blue'>" + (dtNow()) + " Connected to someone!</span>");
          });
        };
        sockjs.sendJSON({
          type: 'initialize'
        });
        return console.log("Created new RTCPeerConnection");
      };
      $scope.refresh = function() {
        if (!$scope.waiting) {
          $scope.closeConnection();
          sockjs.sendJSON({
            type: 'leave'
          });
        }
        return $scope.newConnection();
      };
      $scope.nextUser = function() {
        $scope.messages.push("<span class='blue'>" + (dtNow()) + " You disconnected</span>");
        $scope.messages.push("<span class='blue'>" + (dtNow()) + " Waiting for a partner...</span>");
        return $scope.refresh();
      };
      $scope.sendChatMessage = function() {
        if ($scope.chatMessage.length > 0) {
          sockjs.sendJSON({
            type: 'chat',
            message: $scope.chatMessage
          });
        }
        return $scope.chatMessage = '';
      };
      $scope.newConnection();
      $rootScope.$on('sockjs:refresh', function() {
        return $scope.refresh();
      });
      $rootScope.$on('sockjs:requestOffer', function() {
        return conn.createOffer(function(desc) {
          return conn.setLocalDescription(desc, function() {
            console.log("sent SDP offer");
            return sockjs.sendJSON({
              type: 'offer',
              sdp: desc
            });
          });
        }, function(err) {
          return console.log(err);
        });
      });
      $rootScope.$on('sockjs:candidate', function(e, data) {
        console.log("received remote candidate");
        return conn.addIceCandidate(new RTCIceCandidate(data.candidate));
      });
      $rootScope.$on('sockjs:sdp', function(e, data) {
        console.log("received remote SDP");
        return conn.setRemoteDescription(new RTCSessionDescription(data.sdp), function() {
          if (conn.remoteDescription.type === 'offer') {
            return conn.createAnswer(function(desc) {
              return conn.setLocalDescription(desc, function() {
                console.log("sent SDP answer");
                return sockjs.sendJSON({
                  type: 'sdp',
                  sdp: desc
                });
              });
            }, function(err) {
              return console.log(err);
            });
          }
        }, function(err) {
          return console.log(err);
        });
      });
      $rootScope.$on('sockjs:chat', function(e, data) {
        return $scope.messages.push("" + (dtNow()) + " " + data.message);
      });
      $rootScope.$on('sockjs:remoteLeft', function() {
        console.log("Remote left");
        $scope.waiting = true;
        $scope.messages.push("<span class='blue'>" + (dtNow()) + " Your partner disconnected</span>");
        $scope.messages.push("<span class='blue'>" + (dtNow()) + " Waiting for a partner...</span>");
        $scope.closeConnection();
        return $scope.newConnection();
      });
      return $rootScope.$on('sockjs:close', function() {
        return $scope.closed = true;
      });
    });
    return sockjs.newSocket(settings.sockUrl);
  }, function(e) {
    console.log("Webcam access denied - bailing");
    return $scope.$apply(function() {
      return $scope.gumDenied = true;
    });
  });
};
