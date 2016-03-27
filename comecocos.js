var walls = [];
var ghost= [];
var points = [];
var obstcacles= [];
var fruits= [];
var pacman;
var piece;
var pause = false;
var score;
var time;
var punctuation = 0;
var hndl_score;
var time_fruit;
var crash_with = false;
var background_sound;
var crash_sound;
var gameover = false;
var time_max = 2.59;

function startGame() {

	gamearea.start();
	background_sound = new sound("Pacman_sound.mp3",true);
	crash_sound = new sound("sound_fruit.mp3",false);
	obstcacles = [walls,ghost,points,fruits];
	buildscene();
	hndl_score = new Worker("handler_score.js");
	if (typeof(sessionStorage.record) == "undefined"){
		sessionStorage.record = 0;
	}
	if(typeof(localStorage.record) == "undefined"){
		localStorage.record = 0;
	}
	
}


var gamearea = {
	height: 550,
	width: 750,
	count: 3000,
    canvas : document.createElement("canvas"),
    count_time: 0,
    start : function() {
        this.canvas.width = gamearea.width;
        this.punctuation_area = 40;
        this.canvas.height = gamearea.height + this.punctuation_area;
        this.context = this.canvas.getContext("2d");
        this.div = document.getElementById("scene")
        this.div.insertBefore(this.canvas, this.div.childNodes[0]);
        this.context.font = "50px Georgia";
        this.context.fillStyle = "white";
		this.context.fillText("Pacman",250,175);
		this.context.font = "20px Georgia";
		this.context.fillText("Drag the pacman figure to the screen",gamearea.width/3,gamearea.height/2);
        //manejador drag and drop
        this.canvas.ondrop = function(event){
        	event.preventDefault();
   			var data = event.dataTransfer.getData("text");				
   			data = document.getElementById(data);
   			pacman.source = data.src; //cambio de color del pacman
        }
        this.canvas.ondragover = function(event){event.preventDefault();}
        
    },

    play: function(){
    	//document.getElementById("btn_play").disabled = true;
    	document.getElementById("btn_play").style.background = "red";
    	background_sound.play();
    	this.interval_update = setInterval(updateGame,100);
    	this.time_out = window.setTimeout(function(){gameover =  true;}, 180000 - gamearea.count_time); //3 minutos de tiempo
    	this.timer = setInterval(updatetime,1000);// 1 segundo
        window.addEventListener('keydown',move_pacman, true); //manejador de eventos asociado a pulsar una tecla
        window.addEventListener('keyup',function(){pacman.vel_x=0;pacman.vel_y=0;},true);
        hndl_score.onmessage = function(event){ 
        punctuation += event.data;
        
        }
    },

    gameover: function(){
    	//gameover gestionado con un booleano;
    	video("PacMan Game Over.mp4");
    	gamearea.end();
    	
    },

    clear: function (){

    	this.context.fillStyle = "black";
    	this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
    },

    pause: function(){
    	if (pause){
    		gamearea.play();
    		document.getElementById("btn_pause").innerHTML="Pause";
    		pause = false;
    	}else{
    		pause = true;
    		background_sound.stop();
    		clearInterval(this.interval_update);
    		clearInterval(this.timer);
    		clearTimeout(this.time_out);
    		document.getElementById("btn_pause").innerHTML="Continue";
    	}
    	
    },

    end: function(){
    	clearInterval(gamearea.interval_update);
    	clearTimeout(gamearea.time_out);
    	background_sound.stop();
    	gamearea.clear();
    	this.context.font = "50px Georgia";
        this.context.fillStyle = "white";
        storage();
		this.context.fillText("Your Score is: "+ punctuation,gamearea.width/3,gamearea.height/2);
		//ghost.length = 0; // hay que vaciar el array porque son componentes dinamicos y sino me los dobla
    	//document.getElementById("btn_play").disabled = false;
    	//document.getElementById("btn_play").style.background = "green";
    	//startGame();
    }
    	

  }

  function figure(width,height,source,pos_x,pos_y,type) {
		this.source = source;
		this.width = width;
		this.height = height;
		this.pos_x = pos_x;
		this.pos_y = pos_y;
		this.type = type; // figure,wall,point or text
		this.vel_x = 0;
		this.vel_y = 0;
		if (type == "ghost"){
			this.vel_y = 1;
		}

		if (type == "text"){
			this.message;
		}
		if(type == "fruit"){
			this.crash_fruit = true;
			time_fruit = 0;
			this.drawn = false;
			this.keep_fruit = false;
		}

		this.update =function(){
			ctx = gamearea.context;
			ctx.beginPath();
			if (this.type == "wall"){
				
				ctx.fillStyle = this.source;
				ctx.fillRect(this.pos_x,this.pos_y,this.width,this.height);

			}else if (this.type == "point"){
				ctx.fillStyle = this.source;
				ctx.arc(this.pos_x,this.pos_y,this.width,0,2*Math.PI);
				ctx.fill();
				ctx.stroke();
			}else if(this.type == "text"){
				ctx.fillStyle =  "yellow";
				ctx.fillText(this.message,this.pos_x,gamearea.height+25); //para texto this.width es el mensaje a imprimir
				
			}else{
				this.image = new Image();
				this.image.src = this.source;
				if (this.type == "fruit"){
					time_fruit += 0.01; //este tiempo depende del intervalUpdate
					var random = Math.random() * 60; //10 = t_max en dibujarse
					if((check_fruit() == false && time_fruit >= random) || this.keep_fruit){  //compruebo que puedo dibujar
						this.drawn = true; //digo que esta dibujada para bloqear a las demas
						ctx.drawImage(this.image,this.pos_x,this.pos_y,this.width,this.height);
						this.keep_fruit=true;
						time_fruit = 0; //reinicio contador
					}
				}else{
					ctx.drawImage(this.image,this.pos_x,this.pos_y,this.width,this.height);
				}
				
				}
			},

		this.new_position = function(){
			this.pos_x += this.vel_x;
			this.pos_y += this.vel_y;
		},

		this.new_message= function(){
			if (this.source == "time"){
				this.message = "TIME " + time_max;
			}else if (this.source == "score"){
				this.message = "SCORE "+ punctuation;
			}
		},

		this.crash = function(obj){
		var left = this.pos_x;
		var top = this.pos_y;
		var right = this.pos_x + this.width;
		var bottom = this.pos_y + this.height;
		var right_obj = obj.pos_x + obj.width
		var left_obj = obj.pos_x;
		var top_obj = obj.pos_y;
		var bottom_obj = obj.pos_y + obj.height;
		crash_with = false;
		if (right > left_obj && left < right_obj && bottom > top_obj && top < bottom_obj){
			if(obj.type == "wall"){
				this.pos_y -= this.vel_y;
				this.pos_x -= this.vel_x;
				this.vel_x= 0;
				this.vel_y= 0;
			}else if(obj.type == "point"){
				if (obj.width == 2){
					hndl_score.postMessage("point");
				}else{
					hndl_score.postMessage("point_plus");
				} 
				crash_with= true;
			}else if(obj.type == "ghost"){
				gameover = true;

			}else{
				if (obj.drawn){
					crash_with = true;
					crash_sound.play();
					hndl_score.postMessage("fruit");
				}
				
			}
		}
	}
}

function updatetime(){
	time_max -= 0.01;
    time_max = time_max.toFixed(2);
    gamearea.count_time += 1000; //paso el tiempo a milisegundos porque es como se cuenta el timeout

}

function updateGame(){
	gamearea.clear();
	move_ghost();
	pacman.new_position();
	drawobstacle();
	pacman.update();
	score.new_message();
	time.new_message();
	score.update();
	time.update();
	if (gameover == true){
		gamearea.gameover();
	}
	if (points.length == 0){
		clearInterval(gamearea.interval_update);
		video("aplausos.mp4");
		gamearea.count_time = 180000 - gamearea.count_time; //tiempo maximo - el que he tardado
		punctuation += gamearea.count_time;
		gamearea.end();
	}
}

function drawobstacle(){
	//bucles anidados el primero selecciona la coleccion de obstaculos(paredes,fantasma...), el segundo dibuja todo el arrray
	var aux;
	for (var i = 0; i < obstcacles.length; i++) {
		aux = obstcacles[i];
		for (var j = 0; j < aux.length ;j++){
			aux[j].update();
			pacman.crash(aux[j]);
			if (crash_with){
				aux.splice(j,1);
			}
		}
	}
}

function move_pacman(evt){

	pacman.vel_y = 0;
	pacman.vel_x = 0;
	vel = 10

	switch (evt.keyCode){

		case 87:
			pacman.vel_y = -vel; //arriba
			break;
			
		case 83:
			pacman.vel_y = vel; //abajo
			break;
			
		case 68:
			pacman.vel_x = vel; //derecha
			break;
			
		case 65:
			pacman.vel_x = -vel; //izquierda
			break;
			
	}
}


function move_ghost(){
	var bottom;
	var up;
	for (var i = 0; i < ghost.length; i++) {
		bottom = ghost[i].height + ghost[i].pos_y + gamearea.height/map.length; 
		up = ghost[i].pos_y - gamearea.height/map.length; //le resto el largo de los bloques
		if(bottom >= gamearea.height || up <= 0){
			ghost[i].vel_y = -ghost[i].vel_y;

		}
		ghost[i].new_position();	
	}
}

function check_fruit(){
	var aux;
	for (var i = 0; i < fruits.length; i++) {
		if (fruits[i].drawn){ //compruebo si hay fruta dibujada 
			aux = fruits[i];
			return true;
			break;
		}
	}
	return false;

}

function storage(){
	if (localStorage.record < punctuation){
		localStorage.record = punctuation;
	}
	if(sessionStorage.record < punctuation){
		sessionStorage.record = punctuation;
	}
	document.getElementById("p1").innerHTML= "Global record: " + localStorage.record;
	document.getElementById("p2").innerHTML= "Session Record: " + sessionStorage.record;
}

function video(src){
	var video = document.createElement("video");
    video.width = 350;
    video.height = 400;
    video.src = src;
    video.autoplay = true;
    video.float = "right";
    gamearea.div.appendChild(video);
    video.onended= function(){gamearea.div.removeChild(video)}
}

function sound(src,loop) {
   	this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    this.sound.loop = loop;
    document.body.appendChild(this.sound);
    this.play = function(){
        this.sound.play();
    }
    this.stop = function(){
        this.sound.pause();
    }
}

function buildscene(){
	var width=0;
	var height=0;	//longitud del array general;;
	var x= 0;
	var y= 0;
	var radio= 2;
	var aux=0;
	score = new figure(0,0,"score",gamearea.width/4,y,"text");
	time = new figure(0,0,"time",gamearea.width/2,y,"text");
	for (var i = 0; i < map.length; i++) {
		y += height;
		x =0;
		width = gamearea.width/map[i].length; //longitud de cada array
		height = gamearea.height/map.length;

		for (var j = 0; j < map[i].length; j++) {
			if (map[i][j] == 0){
				walls.push(new figure(width+1,height+1,"blue",x,y,"wall"));
			}else if(map[i][j] == 1){
				if (aux == 4){
					aux=0;
					radio = 4;
				}else{
					radio = 2;
				}
				aux +=1;
				points.push(new figure(radio,radio/2,"white",x+width/2,y+height/2,"point"));
				//la altura de los ptos es importante para el crash
			}else if(map[i][j] == 3){
				pacman = new figure(width-12,height-10,"yellowpacman.png",x,y+1,"figure");

			}else if(map[i][j] == 5){
				ghost.push(new figure(width/2,height/2,"ghost.png",x+width/3,y+height/3,"ghost"));

			}else if(map[i][j] == 4){
				fruits.push(new figure(width/2,height/2,"fruit.png",x+width/3,y+height/3,"fruit"))
			}
				x+=width
			}
			
		}
	}		

map = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 1, 1, 1, 5, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
	[0, 4, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
	[0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
	[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
	[0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
	[0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],		//wall = 0 points = 0 empty=2;																		
	[2, 2, 2, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 4, 0, 2, 2],		//pacman=3 fruits= 4 ghost = 5;
	[0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
	[3, 2, 2, 2, 1, 1, 1, 0, 1, 1, 2, 0, 1, 1, 1, 2, 2, 2],
	[0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
	[2, 2, 2, 0, 4, 0, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 2, 2],
	[0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 5, 0, 0, 0],
	[0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

