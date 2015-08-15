function Player(el) {
  this.ac = new (window.AudioContext || webkitAudioContext)();

  this.el = document.querySelector(el);
  this.dropzone = document.querySelector('#dropzone');
  this.button = this.el.querySelector('.button');
  this.track = this.el.querySelector('.track');
  this.progress = this.el.querySelector('.progress');
  this.scrubber = this.el.querySelector('.scrubber');
  this.fileSelector = this.el.querySelector('#file-selector');
  this.fileName = this.el.querySelector('.file-name');

  this.analyser = new Analyser(this.ac, this.el);

  this.bindEvents();
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
    this.analyser.clear();
    this.play();
    this.analyser.draw();
  }.bind(this));
};

Player.prototype.connect = function() {
  if (this.playing) {
    this.pause();
  }

  this.source = this.ac.createBufferSource();
  this.source.buffer = this.buffer;
  this.source.connect(this.analyser.instance);
  this.analyser.instance.connect(this.ac.destination);
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
  if ( ! this.buffer || e.target.classList.contains('scrubber')) {
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
