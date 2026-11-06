(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sceneNames = ['wish', 'candle', 'fireworks', 'letter'];
  const sceneTitles = { wish: '雨天，把愿望写给星空', candle: '轻轻一吹，愿望起飞', fireworks: '雨天，20岁生日快乐', letter: '狸写给雨天的信' };
  const fireworks = new BirthdayFireworks($('#fireworks-canvas'));
  let currentScene = '', letterPage = 1, blowing = false, submitting = false;
  let routeTimers = [], unlocked = false, wish = '';
  try {
    wish = (sessionStorage.getItem('yutian-wish-v3') || '').slice(0, 120);
    unlocked = !!wish && sessionStorage.getItem('yutian-fireworks-v3') === 'yes';
  } catch { /* The experience also works without browser storage. */ }
  $('#wish-input').value = wish;

  const letterPageCount = $$('.letter-page').length;
  let cake = null, cameraZoom = 1.1;
  try { cake = new window.BirthdayCake($('#cake-3d')); } catch { /* Keep the illustrated cake if 3D is unavailable. */ }
  if (cake?.available) $('#cake-stage').classList.add('has-3d');
  else $('#camera-hint').textContent = '拉近看看 · 拉远欣赏';
  let finaleTimer = null, finaleRemaining = 0, finaleStarted = 0;
  function setFinaleUi(visible) {
    ['.site-header', '.site-footer', '.finale-content', '.finale-controls'].forEach(selector => {
      const element = $(selector);
      element.inert = !visible;
      if (visible) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', 'true');
    });
  }
  function clearFinale() {
    clearTimeout(finaleTimer); finaleTimer = null; finaleRemaining = 0;
    document.body.classList.remove('fireworks-only', 'fireworks-reveal');
    setFinaleUi(true);
  }
  function scheduleFinaleReveal() {
    if (finaleTimer !== null || finaleRemaining <= 0 || document.hidden || currentScene !== 'fireworks') return;
    finaleStarted = performance.now();
    finaleTimer = setTimeout(() => {
      finaleTimer = null; finaleRemaining = 0;
      if (currentScene !== 'fireworks') return;
      document.body.classList.remove('fireworks-only');
      document.body.classList.add('fireworks-reveal');
      setFinaleUi(true);
    }, finaleRemaining);
  }
  function beginFinale() {
    clearFinale();
    finaleRemaining = 9000;
    document.body.classList.add('fireworks-only');
    setFinaleUi(false);
    scheduleFinaleReveal();
  }
  function pauseFinaleReveal() {
    if (finaleTimer === null) return;
    clearTimeout(finaleTimer); finaleTimer = null;
    finaleRemaining = Math.max(1, finaleRemaining - (performance.now() - finaleStarted));
  }
  function setCameraZoom(value, duration = 800) {
    cameraZoom = Math.max(.4, Math.min(1.6, value));
    if (cake?.available) cake.setZoom(cameraZoom, reducedMotion.matches ? 0 : duration);
    else $('#cake-stage').style.setProperty('--cake-zoom', cameraZoom);
    $('#camera-in').disabled = cameraZoom >= 1.59;
    $('#camera-out').disabled = cameraZoom <= .61;
  }
  let micStream = null, micAudio = null, micFrame = null, micTimeout = null, micNonce = 0, micActive = false;

  function later(callback, delay) {
    const id = setTimeout(callback, delay);
    routeTimers.push(id);
    return id;
  }
  function stopMic() {
    micNonce++;
    micActive = false;
    if (micFrame !== null) cancelAnimationFrame(micFrame);
    micFrame = null;
    clearTimeout(micTimeout);
    micTimeout = null;
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    micStream = null;
    if (micAudio) micAudio.close().catch(() => {});
    micAudio = null;
    $('#mic-blow').setAttribute('aria-pressed', 'false');
    $('#mic-blow').textContent = '也可以用麦克风，真的吹一下 ↗';
    $('#breath-meter').hidden = true;
  }
  function cancelTransitions() {
    routeTimers.forEach(clearTimeout);
    routeTimers = [];
    blowing = false; submitting = false;
    stopMic();
    document.body.classList.remove('body-transition', 'camera-departure');
    clearFinale();
    $('#wish-form').classList.remove('is-sending');
    $('#submit-wish').disabled = false;
  }
  function go(hash) {
    if (location.hash === hash) renderRoute();
    else location.hash = hash;
  }
  function readRoute(hash) {
    if (hash === '#/letter' || /^#\/letter\/[1-9][0-9]*$/.test(hash)) return { scene: 'letter', page: Math.min(letterPageCount, Number(hash.split('/')[2]) || 1) };
    const scene = hash.replace(/^#\//, '');
    return { scene: sceneNames.includes(scene) ? scene : 'wish', page: 1 };
  }
  function renderRoute() {
    const route = readRoute(location.hash);
    if ((route.scene === 'candle' || route.scene === 'fireworks') && !wish) route.scene = 'wish';
    else if (route.scene === 'fireworks' && !unlocked) route.scene = 'candle';
    const canonical = route.scene === 'letter' ? `#/letter/${route.page}` : `#/${route.scene}`;
    if (location.hash !== canonical) history.replaceState(null, '', canonical);
    cancelTransitions();
    const previousScene = currentScene;
    currentScene = route.scene; letterPage = route.page;
    document.body.dataset.scene = currentScene;
    document.title = sceneTitles[currentScene] + ' · Dear 狸';
    $$('.scene').forEach(scene => {
      scene.hidden = scene.id !== 'scene-' + currentScene;
      scene.classList.remove('is-entering');
    });
    const active = $('#scene-' + currentScene);
    if (previousScene !== currentScene) active.classList.add('is-entering');
    active.scrollTop = 0;
    active.focus({ preventScroll: true });
    $$('.letter-page').forEach(page => { page.hidden = Number(page.dataset.letter) !== letterPage; });
    $('#letter-page-number').textContent = String(letterPage).padStart(2, '0');
    $('#letter-prev').disabled = letterPage === 1;
    $('#letter-next').innerHTML = letterPage === letterPageCount ? '去许个愿 <span aria-hidden="true">↗</span>' : '下一页 <span aria-hidden="true">→</span>';
    $$('.chapter-nav a').forEach(link => {
      if (link.dataset.chapter === currentScene) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      if (link.dataset.chapter === 'fireworks') {
        link.setAttribute('aria-disabled', String(!unlocked));
        link.tabIndex = unlocked ? 0 : -1;
      }
    });
    $('#footer-page').textContent = String(sceneNames.indexOf(currentScene) + 1).padStart(2, '0') + ' — 04';
    $('#saved-wish-text').textContent = wish;
    $('#saved-wish-text').title = wish;
    cake?.stop();
    if (currentScene === 'candle') {
      cake?.reset(); cake?.start();
      setCameraZoom(reducedMotion.matches ? 1.1 : .65, 0);
      if (!reducedMotion.matches) later(() => setCameraZoom(1.1, 1900), 120);
      $('#cake-stage').classList.remove('is-blown', 'is-blowing');
      $('#blow-candles').disabled = false;
      $('#mic-blow').disabled = false;
      $('#blow-candles span').textContent = '吹灭蜡烛，点亮夜空';
      $('#wish-status').textContent = '准备好了吗？吹灭烛光，让烟花替你绽放。';
    }
    if (currentScene === 'letter') fireworks.stop();
    else if (currentScene !== previousScene || !fireworks.active) fireworks.start();
    if (currentScene === 'fireworks') beginFinale();
    updateMotionLabel();
  }
  function updateWishCount() {
    $('#wish-count').textContent = $('#wish-input').value.length + ' / 120';
    $('#wish-input').removeAttribute('aria-invalid');
    $('#wish-error').textContent = '';
  }
  $('#wish-input').addEventListener('input', updateWishCount);
  $('#wish-form').addEventListener('submit', event => {
    event.preventDefault();
    if (submitting) return;
    const draft = $('#wish-input').value.trim().slice(0, 120);
    if (!draft) {
      $('#wish-error').textContent = '写下一点点期待，再让星星替你收好。';
      $('#wish-input').setAttribute('aria-invalid', 'true');
      $('#wish-input').focus(); return;
    }
    wish = draft; unlocked = false;
    try { sessionStorage.setItem('yutian-wish-v3', wish); sessionStorage.removeItem('yutian-fireworks-v3'); } catch {}
    submitting = true;
    $('#submit-wish').disabled = true;
    $('#wish-form').classList.add('is-sending');
    $('#wish-input').blur();
    later(() => go('#/candle'), reducedMotion.matches ? 50 : 550);
  });
  $('#letter-prev').addEventListener('click', () => { if (letterPage > 1) go(`#/letter/${letterPage - 1}`); });
  $('#letter-next').addEventListener('click', () => go(letterPage < letterPageCount ? `#/letter/${letterPage + 1}` : '#/wish'));
  $$('.chapter-nav a').forEach(link => link.addEventListener('click', event => {
    if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
  }));
  document.addEventListener('keydown', event => {
    if (currentScene !== 'letter' || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === 'ArrowLeft' && letterPage > 1) { event.preventDefault(); go(`#/letter/${letterPage - 1}`); }
    if (event.key === 'ArrowRight') { event.preventDefault(); go(letterPage < letterPageCount ? `#/letter/${letterPage + 1}` : '#/wish'); }
  });

  function blowCandles() {
    if (currentScene !== 'candle' || blowing) return;
    stopMic(); blowing = true;
    $('#blow-candles').disabled = true; $('#mic-blow').disabled = true;
    $('#blow-candles span').textContent = '愿望正在飞向星空…';
    $('#cake-stage').classList.add('is-blowing');
    cake?.setWind(true);
    $('#wish-status').textContent = '雨天，这场烟花，专门为你而放。';
    later(() => {
      $('#cake-stage').classList.remove('is-blowing');
      $('#cake-stage').classList.add('is-blown');
      cake?.setWind(false); cake?.setBlown(true);
    }, reducedMotion.matches ? 0 : 550);
    later(() => {
      document.body.classList.add('camera-departure');
      setCameraZoom(.4, 1400);
    }, reducedMotion.matches ? 50 : 1100);
    later(() => document.body.classList.add('body-transition'), reducedMotion.matches ? 100 : 2550);
    later(() => {
      unlocked = true;
      try { sessionStorage.setItem('yutian-fireworks-v3', 'yes'); } catch {}
      go('#/fireworks');
    }, reducedMotion.matches ? 220 : 3050);
  }
  $('#blow-candles').addEventListener('click', blowCandles);
  $('#camera-in').addEventListener('click', () => { if (!blowing) setCameraZoom(cameraZoom + .25); });
  $('#camera-out').addEventListener('click', () => { if (!blowing) setCameraZoom(Math.max(.6, cameraZoom - .25)); });
  $('#mic-blow').addEventListener('click', async () => {
    if (currentScene !== 'candle' || blowing) return;
    if (micActive) { stopMic(); $('#wish-status').textContent = '麦克风已关闭，也可以点击按钮吹灭。'; return; }
    if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
      $('#wish-status').textContent = '当前浏览器不支持麦克风，点击按钮也能吹灭。'; return;
    }
    micActive = true; const nonce = ++micNonce;
    $('#mic-blow').setAttribute('aria-pressed', 'true');
    $('#mic-blow').textContent = '取消麦克风';
    $('#wish-status').textContent = '允许使用麦克风后，靠近它轻轻吹气。';
    micTimeout = setTimeout(() => {
      if (nonce !== micNonce) return;
      stopMic(); $('#wish-status').textContent = '没关系，点击按钮也能吹灭这份烛光。';
    }, 20000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (nonce !== micNonce || currentScene !== 'candle') { stream.getTracks().forEach(track => track.stop()); return; }
      micStream = stream;
      const context = new (window.AudioContext || window.webkitAudioContext)();
      micAudio = context;
      await context.resume();
      if (nonce !== micNonce || currentScene !== 'candle') return;
      const analyser = context.createAnalyser(); analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const started = performance.now(); let lastSample = started, sustained = 0, baseline = 0, calibrations = 0;
      $('#wish-status').textContent = '正在听…靠近麦克风，轻轻吹一下。';
      $('#breath-meter').hidden = false;
      function listen(now) {
        if (nonce !== micNonce || currentScene !== 'candle') return;
        analyser.getFloatTimeDomainData(samples);
        let total = 0; for (const value of samples) total += value * value;
        const level = Math.sqrt(total / samples.length);
        if (now - started < 500) { baseline += level; calibrations++; }
        const threshold = Math.min(.18, Math.max(.04, (baseline / Math.max(1, calibrations)) * 2.6));
        const delta = Math.min(50, now - lastSample); lastSample = now;
        if (now - started >= 600) sustained = level > threshold ? sustained + delta : Math.max(0, sustained - delta * 1.5);
        $('#breath-meter i').style.transform = `scaleX(${Math.min(1, level / threshold)})`;
        if (sustained >= 230) { blowCandles(); return; }
        micFrame = requestAnimationFrame(listen);
      }
      micFrame = requestAnimationFrame(listen);
    } catch {
      if (nonce !== micNonce) return;
      stopMic();
      $('#wish-status').textContent = '暂时无法使用麦克风，点击按钮一样能吹灭。';
    }
  });

  $('#sky-touch').addEventListener('click', event => fireworks.tap(event.clientX, event.clientY));
  $('#more-fireworks').addEventListener('click', () => {
    fireworks.start();
    beginFinale();
    $('#fireworks-hint').innerHTML = '愿你所愿，都慢慢实现。<span>往后的每一岁，都要好好的。</span>';
  });
  function updateMotionLabel() {
    $('#motion-toggle').textContent = fireworks.motion ? '暂停烟花动画' : '播放烟花动画';
    $('#motion-toggle').setAttribute('aria-pressed', String(fireworks.motion));
  }
  $('#motion-toggle').addEventListener('click', () => { fireworks.setMotion(!fireworks.motion); updateMotionLabel(); });
  reducedMotion.addEventListener('change', event => { fireworks.setMotion(!event.matches); updateMotionLabel(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMic(); fireworks.suspend(); cake?.stop(); pauseFinaleReveal();
    } else {
      fireworks.resume();
      if (currentScene === 'candle') cake?.start();
      scheduleFinaleReveal();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && currentScene === 'fireworks' && finaleRemaining > 0) {
      clearFinale(); document.body.classList.add('fireworks-reveal');
    }
  });
  window.addEventListener('pagehide', () => { cancelTransitions(); fireworks.suspend(); cake?.stop(); });
  window.addEventListener('pageshow', event => { if (event.persisted) renderRoute(); });
  window.addEventListener('hashchange', renderRoute);
  updateWishCount(); renderRoute();
})();
