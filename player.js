function Player (el) {
  this.ac = new (window.AudioContext || webkitAudioContext)();
  this.el = el;
  this.dropzone = document.querySelector('#dropzone');
  this.button = el.querySelector('.button');
  this.track = el.querySelector('.track');
  this.progress = el.querySelector('.progress');
  this.scrubber = el.querySelector('.scrubber');
  this.fileSelector = el.querySelector('#file-selector');
  this.fileName = el.querySelector('.file-name');

  this.bindEvents();
  this.analyserCanvasInit();
}

Player.prototype.bindEvents = function() {
  this.button.addEventListener('click', this.toggle.bind(this));
  this.scrubber.addEventListener('mousedown', this.onMouseDown.bind(this));
  this.track.addEventListener('click', this.onTrackClick.bind(this));
  window.addEventListener('mousemove', this.onDrag.bind(this));
  window.addEventListener('mouseup', this.onMouseUp.bind(this));
  this.dropzone.addEventListener('drop', this.onDrop.bind(this));
  this.dropzone.addEventListener('dragover', this.onDragOver.bind(this));
  this.dropzone.addEventListener('drop', this.onDragLeave.bind(this));
  this.dropzone.addEventListener('dragleave', this.onDragLeave.bind(this));
  this.fileSelector.addEventListener('change', this.onFileSelected.bind(this));
};

Player.prototype.fetch = function(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function() {
    this.decode(xhr.response);
  }.bind(this);
  xhr.send();
};

Player.prototype.decode = function(arrayBuffer) {
  this.button.disabled = true;
  this.ac.decodeAudioData(arrayBuffer, function(audioBuffer) {
    this.buffer = audioBuffer;
    this.seek(0);
    this.draw();
    this.analyserInit();
    this.play();
    this.analyserDraw();
  }.bind(this));
};

Player.prototype.connect = function() {
  if (this.playing) {
    this.pause();
  }

  this.source = this.ac.createBufferSource();
  this.source.buffer = this.buffer;
  this.source.connect(this.analyser);
  this.analyser.connect(this.ac.destination);
};

Player.prototype.play = function(position) {
  this.connect();
  this.position = typeof position === 'number' ? position : this.position || 0;
  this.startTime = this.ac.currentTime - (this.position || 0);
  this.source.start(this.ac.currentTime, this.position);
  this.playing = true;
};

Player.prototype.pause = function() {
  if (this.source) {
    this.source.stop(0);
    this.source = null;
    this.position = this.ac.currentTime - this.startTime;
    this.playing = false;
  }
};

Player.prototype.seek = function(time) {
  if (this.playing) {
    this.play(time);
  } else {
    this.position = time;
  }
};

Player.prototype.updatePosition = function() {
  this.position = this.playing ?
    this.ac.currentTime - this.startTime : this.position;

  if (this.position >= this.buffer.duration) {
    this.onPLaybackFinished();
  }

  return this.position;
};

Player.prototype.onPLaybackFinished = function() {
  this.position = 0;
  this.pause();
};

Player.prototype.toggle = function() {
  if (this.playing) {
    this.pause();
  } else {
    this.play();
  }
};

Player.prototype.onTrackClick = function(e) {
  if ( ! this.buffer || e.target.className != 'track') {
    return false;
  }

  this.scrubber.style.left = e.offsetX;

  this.jumpToPosition(e.offsetX);
};

Player.prototype.onMouseDown = function(e) {
  if ( ! this.buffer) {
    return false;
  }

  this.dragging = true;
  this.startX = e.pageX;
  this.startLeft = parseInt(this.scrubber.style.left || 0, 10);
};

Player.prototype.onDrag = function(e) {
  if ( ! this.dragging) {
    return false;
  }

  var width;
  var position;

  width = this.track.offsetWidth;
  position = this.startLeft + (e.pageX - this.startX);
  position = Math.max(Math.min(width, position), 0);
  this.scrubber.style.left = position + 'px';
};

Player.prototype.onMouseUp = function() {
  if (this.dragging) {
    this.jumpToPosition(this.scrubber.style.left);

    this.dragging = false;
  }
};

Player.prototype.jumpToPosition = function(x) {
  var width = this.track.offsetWidth;
  var left = parseInt(x || 0, 10);
  var time = left / width * this.buffer.duration;

  this.seek(time);
};

Player.prototype.onDrop = function(e) {
  e.preventDefault();
  e.stopPropagation();

  var files = e.dataTransfer.files;
  var file = files[0];

  if (file) {
    var reader = new FileReader();

    this.printFileName(file);
    reader.addEventListener('load', this.onDraggedFileLoad.bind(this));
    reader.readAsArrayBuffer(file);
  }
};

Player.prototype.onDraggedFileLoad = function(e) {
  var data = e.target.result;

  this.decode(data);
};

Player.prototype.onFileSelected = function(e) {
  var files = e.target.files;
  var file = files[0];
  var url = URL.createObjectURL(file);

  this.printFileName(file);
  this.fetch(url);
};

Player.prototype.printFileName = function(file) {
  this.fileName.innerHTML = file.name;
}

Player.prototype.onDragOver = function(e) {
  e.preventDefault();
  e.stopPropagation();

  this.dropzone.classList.add('over');
};

Player.prototype.onDragLeave = function(e) {
  this.dropzone.classList.remove('over');
};

Player.prototype.draw = function() {
  var progress = (this.updatePosition() / this.buffer.duration);
  var width = this.track.offsetWidth;

  if (this.playing) {
    this.button.classList.add('pause');
    this.button.classList.remove('play');
  } else {
    this.button.classList.add('play');
    this.button.classList.remove('pause');
  }

  this.progress.style.width = (progress * width) + 'px';

  if ( ! this.dragging) {
    this.scrubber.style.left = (progress * width) + 'px';
  }

  requestAnimationFrame(this.draw.bind(this));

  this.button.disabled = false;
};

Player.prototype.analyserInit = function() {
  this.analyserCanvasInit();

  var analyser = this.ac.createAnalyser();

  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.9;
  analyser.fftSize = 512;

  this.canvasBufferLength = analyser.frequencyBinCount;
  this.canvasDataArray = new Uint8Array(this.canvasBufferLength);

  this.analyser = analyser;
};

Player.prototype.analyserCanvasInit = function() {
  var canvas = this.el.querySelector('.analyser');

  this.analyserContext = canvas.getContext('2d');
  this.canvasWidth = canvas.width;
  this.canvasHeight = canvas.height;

  this.canvasClear();

  this.analyserCanvas = canvas;
};

Player.prototype.canvasClear = function() {
  this.analyserContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

  this.analyserContext.fillStyle = 'rgb(0, 0, 0)';
  this.analyserContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
};

Player.prototype.analyserDraw = function() {
  this.analyser.getByteFrequencyData(this.canvasDataArray);

  this.analyserContext.fillStyle = 'rgb(0, 0, 0)';
  this.analyserContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

  var barWidth = (this.canvasWidth / this.canvasBufferLength) * 2.5;
  var barHeight;
  var x = 0;

  for (var i = 0; i < this.canvasBufferLength; i++) {
    barHeight = this.canvasDataArray[i];

    this.analyserContext.fillStyle = 'rgb(' + (255 - barHeight) + ',255,' + (255 - barHeight) + ')';
    this.analyserContext.fillRect(x, this.canvasHeight - barHeight / 2, barWidth, barHeight / 2);

    x += barWidth + 1;
  }

  requestAnimationFrame(this.analyserDraw.bind(this));
};

var playerElement = document.querySelector('.player');
var player = new Player(playerElement);
