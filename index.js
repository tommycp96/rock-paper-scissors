const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const compression = require('compression')

app.use(compression())

app.use(express.static('public'))

let us = []

io.on('connection', (socket) => {
  console.log(`ayy`)
  let uname = ``
  if(socket.handshake.headers['x-replit-user-name']){
    uname = socket.handshake.headers['x-replit-user-name']
    console.log(`yay`)
    if(us.includes(uname)){
      socket.emit(`li`,false)
    }else{
      socket.emit(`li`,true,socket.handshake.headers['x-replit-user-name'])
      socket.join(`waiting`)
      socket.emit(`waiting`,true)
      us.push(uname)

      socket.on('disconnect',()=>{
        let i = us.indexOf(uname);
        if (i > -1) {
          us.splice(i, 1);
        }
      })
    }
  }else{
    socket.emit(`li`,false)
  }
});

function startRoom(room){
  io.in(room).fetchSockets().then((sockets)=>{
    if(sockets.length !== 2){
      for(let i=0;i<sockets.length;i++){
        sockets[i].leave(room)
        sockets[i].join(`waiting`)
        sockets[i].emit(`waiting`,true)
      }
      return
    }
    // lmk bro
    sockets[0].emit(`inRoom`,sockets[1].handshake.headers['x-replit-user-name'])
    sockets[1].emit(`inRoom`,sockets[0].handshake.headers['x-replit-user-name'])

    let allHere = true
    let canImage = true
    let finals = {
      
    }

    let onDisconnect = ()=>{
      canImage = false
      allHere = false
      for(let e=0;e<sockets.length;e++){
        if(sockets[e]){
          sockets[e].leave(room)
          sockets[e].join(`waiting`)
          sockets[e].emit(`partnerLeft`,true)
          sockets[e].emit(`waiting`,true)
        }
      }
      io.removeListener(`disconnect`,onDisconnect)
      io.removeListener(`final`,onDisconnect)
      io.removeListener(`image`,onImage)
    }

    let imageA = 0
    let imageB = 0
    let aFinal = ``
    let bFinal = ``

    let onImage = (image, sid)=>{
      if(sid == sockets[0].id){
        if(imageA == 0){
          imageA = 1
          sockets[1].emit('otherImage',image)
          console.log(`other image 1 a`)
        }else if(imageA == 1){
          imageA = 2
          sockets[1].emit('otherImage',image)
          console.log(`other image 2 a`)
        }
      }else if(sid == sockets[1].id){
        if(imageB == 0){
          imageB = 1
          sockets[0].emit('otherImage',image)
          console.log(`other image 1`)
        }else if(imageB == 1){
          imageB = 2
          sockets[0].emit('otherImage',image)
          console.log(`other image 2`)
        }
      }
    }
    let onPose = (pose, sid)=>{
      if(sid == sockets[0].id){
        aFinal = pose
      }else if(sid == sockets[1].id){
        bFinal = pose
      }
    }

    let d = Date.now()
    
    io.to(room).emit('time',d)
    io.to(room).emit('countdown',0,d+9000)
    for(let i=0; i<sockets.length;i++){
      sockets[i].on('disconnect',onDisconnect)
      sockets[i].on('image',onImage)
      sockets[i].on('pose',onPose)
    }

    setTimeout(()=>{
      io.to(room).emit('sendImage')
    },2500)

    let dictionaryOfSomething = {
      1: "Rock",
      2: "Paper",
      3: "Scissors"
    }

    setTimeout(()=>{
      if(!allHere)return;
      io.to(room).emit('countdown',1,d+3000)
      canImage = false

      setTimeout(()=>{
        if(!allHere)return;
        
        io.to(room).emit('countdown', 2, 0)
        io.to(room).emit('sendImage')
        
        setTimeout(()=>{
          if(!allHere)return;
          
          let winner;

          switch(aFinal){case"Rock":aFinal=1;break;case"Paper":aFinal=2;break;case"Scissors":aFinal=3;break;default:aFinal=!1}
          switch(bFinal){case"Rock":bFinal=1;break;case"Paper":bFinal=2;break;case"Scissors":bFinal=3;break;default:bFinal=!1}

          if(aFinal == bFinal){
            winner = 0
          }else{
            // 1 is Rock
            // 2 is Paper
            // 3 is Scissors
            if(aFinal == 2 && bFinal == 1){
              winner = 1
            }
            if(aFinal == 3 && bFinal == 1){
              winner = 2
            }
            if(aFinal == 1 && bFinal == 2){
              winner = 2
            }
            if(aFinal == 3 && bFinal == 2){
              winner = 1
            }
            if(aFinal == 1 && bFinal == 3){
              winner = 1
            }
            if(aFinal == 2 && bFinal == 3){
              winner = 2
            }
          }

          if(!aFinal || !bFinal){
            if(!aFinal && !bFinal){
              // Both didn't
              sockets[0].emit(`winner`,0,1,`Not detectable`,`Not detectable`)
              sockets[1].emit(`winner`,0,2,`Not detectable`,`Not detectable`)
              setTimeout(()=>{
                if(!allHere) return;
                io.removeListener(`disconnect`,onDisconnect)
                io.removeListener(`final`,onDisconnect)
                io.removeListener(`image`,onImage)
                startRoom(room)
              },5000)
            }else if(!aFinal){
              // A didn't
              winner = 2
              aFinal = `Not detectable`
            }else{
              // B didn't
              winner = 1
              bFinal = `Not detectable`
            }
          }
          if(!(!aFinal && !bFinal)){
            if(dictionaryOfSomething[aFinal]){aFinal=dictionaryOfSomething[aFinal]}
            if(dictionaryOfSomething[bFinal]){bFinal=dictionaryOfSomething[bFinal]}
            
            sockets[0].emit(`winner`,winner,1,aFinal,bFinal)
            sockets[1].emit(`winner`,winner,2,aFinal,bFinal)
            
            setTimeout(()=>{
              if(!allHere) return;
              for(let i=0; i<sockets.length;i++){
                sockets[i].leave(room)
                sockets[i].join(`waiting`)
                sockets[i].emit(`waiting`,true)
              }
              io.removeListener(`disconnect`,onDisconnect)
              io.removeListener(`final`,onDisconnect)
              io.removeListener(`image`,onImage)
            },5000)
          }
        },2000)
      },3000)
    },9000)
  })
}

setInterval(()=>{
  io.in("waiting").fetchSockets().then((sockets)=>{
    if(sockets.length >= 2){
      let socketa,socketb;
      if(sockets.length > 2){
        if(Math.random()>0.5){
          socketa = sockets[1]
          socketb = sockets[2]
        }else{
          socketa = sockets[0]
          socketb = sockets[2]
        }
      }else{
        socketa = sockets[1]
        socketb = sockets[0]
      }
      socketa.leave(`waiting`)
      socketb.leave(`waiting`)
      socketa.join(`${socketa.id} ${socketb.id}`)
      socketb.join(`${socketa.id} ${socketb.id}`)
      startRoom(`${socketa.id} ${socketb.id}`)
    }
  })
},1000)

setInterval(()=>{
  io.in("waiting").fetchSockets().then((sockets)=>{
    console.log(`${sockets.length} in waiting`)
  })
},60000)

server.listen(3000, () => {
  console.log('listening on *:3000');
});