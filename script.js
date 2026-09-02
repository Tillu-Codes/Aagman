(function(){
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var cardOverlay = document.getElementById('card-overlay');
  var mainContent = document.getElementById('main-content');
  var particleCanvas = document.getElementById('particle-canvas');
  var ctx = particleCanvas ? particleCanvas.getContext('2d') : null;
  var ambientParticles = [];
  var burstParticles = [];
  var cardOpened = false;
  var revealObserver = null;
  var isMuted = false;
  var audioCtx = null;
  var muteBtn = document.getElementById('mute-btn');
  var muteIcon = muteBtn ? muteBtn.querySelector('.mute-icon') : null;

  function resizeCanvas(){
    if(!particleCanvas) return;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function AmbientParticle(){
    this.reset();
  }
  AmbientParticle.prototype.reset = function(){
    this.x = Math.random() * (particleCanvas ? particleCanvas.width : window.innerWidth);
    this.y = Math.random() * (particleCanvas ? particleCanvas.height : window.innerHeight);
    this.size = Math.random() * 2.5 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.8;
    this.speedY = (Math.random() - 0.5) * 0.8 - 0.3;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.hue = 38 + Math.random() * 25;
    this.life = Math.random() * 300 + 200;
    this.maxLife = this.life;
  };
  AmbientParticle.prototype.update = function(){
    this.x += this.speedX;
    this.y += this.speedY;
    this.life--;
    this.opacity = (this.life / this.maxLife) * 0.4;
    if(this.life <= 0 || this.x < -20 || this.x > (particleCanvas ? particleCanvas.width + 20 : window.innerWidth + 20) || this.y < -20 || this.y > (particleCanvas ? particleCanvas.height + 20 : window.innerHeight + 20)){
      this.reset();
    }
  };
  AmbientParticle.prototype.draw = function(){
    if(!ctx) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.fillStyle = 'hsl(' + this.hue + ', 70%, 65%)';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'hsl(' + this.hue + ', 70%, 55%)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.3, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  function BurstParticle(x,y){
    this.x = x;
    this.y = y;
    var angle = Math.random() * Math.PI * 2;
    var speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = Math.random() * 4 + 2;
    this.opacity = 1;
    this.life = Math.random() * 60 + 30;
    this.maxLife = this.life;
    this.hue = 40 + Math.random() * 30;
    this.gravity = 0.08;
  }
  BurstParticle.prototype.update = function(){
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.98;
    this.life--;
    this.opacity = (this.life / this.maxLife);
    this.size *= 0.97;
  };
  BurstParticle.prototype.draw = function(){
    if(!ctx || this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.fillStyle = 'hsl(' + this.hue + ', 90%, 75%)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'hsl(' + this.hue + ', 90%, 60%)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.3, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  function burstAt(x, y){
    if(prefersReducedMotion.matches) return;
    var count = Math.min(70, Math.floor(window.innerWidth / 8));
    for(var i = 0; i < count; i++){
      burstParticles.push(new BurstParticle(x, y));
    }
  }

  function animate(){
    if(!ctx){ requestAnimationFrame(animate); return; }
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    for(var i = ambientParticles.length - 1; i >= 0; i--){
      ambientParticles[i].update();
      ambientParticles[i].draw();
    }
    while(ambientParticles.length < 40 && !prefersReducedMotion.matches){
      ambientParticles.push(new AmbientParticle());
    }
    for(var j = burstParticles.length - 1; j >= 0; j--){
      burstParticles[j].update();
      burstParticles[j].draw();
      if(burstParticles[j].life <= 0) burstParticles.splice(j, 1);
    }
    requestAnimationFrame(animate);
  }
  animate();

  function openCard(e){
    if(cardOpened) return;
    cardOpened = true;
    if(e) e.preventDefault();

    var rect = cardOverlay.getBoundingClientRect();
    burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2);

    cardOverlay.classList.add('opened');

    if(!prefersReducedMotion.matches){
      var cardFront = cardOverlay.querySelector('.card-front');
      if(cardFront) cardFront.style.willChange = 'transform';
    }

    setTimeout(function(){
      if(!isMuted) playChime();
    }, 200);

    var revealDelay = prefersReducedMotion.matches ? 50 : 1400;
    setTimeout(function(){
      cardOverlay.classList.add('closing');
      mainContent.classList.remove('page-hidden');
      mainContent.classList.add('page-visible');
      setTimeout(function(){
        cardOverlay.classList.add('open');
        var cf = cardOverlay.querySelector('.card-front');
        if(cf) cf.style.willChange = 'auto';
      }, 50);
      setupReveals();
    }, revealDelay);
  }

  function playChime(){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.9);
    }catch(err){}
  }

  if(cardOverlay){
    cardOverlay.addEventListener('click', openCard);
    cardOverlay.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        openCard(e);
      }
    });
  }

  if(muteBtn){
    muteBtn.addEventListener('click', function(e){
      e.stopPropagation();
      isMuted = !isMuted;
      muteIcon.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  function setupReveals(){
    if(revealObserver) revealObserver.disconnect();
    var reveals = document.querySelectorAll('.reveal');
    revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          var imgs = entry.target.querySelectorAll('.img-reveal');
          imgs.forEach(function(wrap){
            var img = wrap.querySelector('img');
            if(img){
              if(img.complete){
                wrap.classList.add('loaded');
              } else {
                img.addEventListener('load', function(){ wrap.classList.add('loaded'); });
                img.addEventListener('error', function(){ wrap.classList.add('loaded'); });
              }
            } else {
              wrap.classList.add('loaded');
            }
          });
          revealObserver.unobserve(entry.target);
        }
      });
    }, {threshold: 0.1, rootMargin: '0px 0px -40px 0px'});
    reveals.forEach(function(el){ revealObserver.observe(el); });
  }

  if(prefersReducedMotion.matches){
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('visible'); });
    document.querySelectorAll('.img-reveal').forEach(function(el){ el.classList.add('loaded'); });
  }
})();