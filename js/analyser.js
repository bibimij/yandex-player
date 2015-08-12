function Analyser(ac, el) {
  this.init(el);

  var analyser = ac.createAnalyser();

  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.9;
  analyser.fftSize = 512;

  this.bufferLength = analyser.frequencyBinCount;
  this.dataArray = new Uint8Array(this.bufferLength);

  this.instance = analyser;
}

Analyser.prototype.init = function(el) {
  var canvas = el.querySelector('.analyser');

  this.context = canvas.getContext('2d');
  this.width = canvas.width;
  this.height = canvas.height;

  this.clear();
};

Analyser.prototype.clear = function() {
  this.context.clearRect(0, 0, this.width, this.height);

  this.fill();
};

Analyser.prototype.fill = function() {
  this.context.fillStyle = 'rgb(0, 0, 0)';
  this.context.fillRect(0, 0, this.width, this.height);
};

Analyser.prototype.draw = function() {
  this.instance.getByteFrequencyData(this.dataArray);

  this.fill();

  var barWidth = (this.width / this.bufferLength) * 2.5;
  var barHeight;
  var x = 0;

  for (var i = 0; i < this.bufferLength; i++) {
    barHeight = this.dataArray[i];

    this.context.fillStyle = 'rgb(' + (255 - barHeight) + ',255,' + (255 - barHeight) + ')';
    this.context.fillRect(x, this.height - barHeight / 2, barWidth, barHeight / 2);

    x += barWidth + 1;
  }

  requestAnimationFrame(this.draw.bind(this));
};
