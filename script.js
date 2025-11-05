const board = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restartBtn');
const sizeSelect = document.getElementById('sizeSelect');
const themeSelect = document.getElementById('themeSelect');
const winModal = document.getElementById('winModal');
const playAgainBtn = document.getElementById('playAgainBtn');
const winMoves = document.getElementById('winMoves');
const winTime = document.getElementById('winTime');
const winBoard = document.getElementById('winBoard');

const THEMES = {
  emoji: ['🍎','🍊','🍉','🍇','🍓','🍒','🍑','🥝','🍍','🥥','🍋','🫐','🥑','🥕','🌽','🍆','🍔','🍕','🍟','🌮','🍣','🍪','🍩','🍰','🧁','🍫','🍿','🥨','🧀','🍗','🍤','🍙','🍜','🍞','🥐'],
  shapes: ['★','◆','●','▲','■','☘','♥','☀','☂','☯','♞','♠','♣','♦','♪','☾','☁','☄','⚑','✿','✚','✦','✺','✪','✸','✧','✤','✣','✢','✥','✲','❖','❀','✷','✶']
};

let state = {
  size: 4, // columns/rows
  theme: 'emoji',
  deck: [],
  first: null,
  second: null,
  lock: false,
  matches: 0,
  moves: 0,
  started: false,
  startTime: 0,
  timerId: null
};

function pad(n){return n.toString().padStart(2,'0')}
function formatTime(ms){
  const s = Math.floor(ms/1000);
  return `${pad(Math.floor(s/60))}:${pad(s%60)}`;
}

function updateBestLabel(){
  const key = bestKey();
  const best = JSON.parse(localStorage.getItem(key) || 'null');
  bestEl.textContent = best ? `${best.moves} • ${formatTime(best.time)}` : '--';
}

function bestKey(){
  return `memory-best-${state.size}-${state.theme}`;
}

function maybeUpdateBest(){
  const elapsed = Date.now() - state.startTime;
  const key = bestKey();
  const prev = JSON.parse(localStorage.getItem(key) || 'null');
  const current = { moves: state.moves, time: elapsed };
  const better = !prev || current.moves < prev.moves || (current.moves === prev.moves && current.time < prev.time);
  if(better){ localStorage.setItem(key, JSON.stringify(current)); }
}

function stopTimer(){
  if(state.timerId){ clearInterval(state.timerId); state.timerId = null; }
}

function resetState(){
  stopTimer();
  state.first = null; state.second = null; state.lock = false; state.matches = 0; state.moves = 0; state.started = false; state.startTime = 0;
  movesEl.textContent = '0';
  timeEl.textContent = '00:00';
}

function startTimer(){
  state.startTime = Date.now();
  state.timerId = setInterval(() => {
    const elapsed = Date.now() - state.startTime;
    timeEl.textContent = formatTime(elapsed);
  }, 250);
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function buildDeck(){
  const total = state.size*state.size; // must be even
  const half = total/2;
  const items = THEMES[state.theme].slice(0, half);
  const deck = shuffle([...items, ...items]).map((symbol, idx) => ({ id: idx, symbol }));
  state.deck = deck;
}

function renderBoard(){
  board.innerHTML = '';
  board.dataset.size = String(state.size);
  board.setAttribute('role','grid');
  const frag = document.createDocumentFragment();
  state.deck.forEach((card, index) => {
    const cell = document.createElement('button');
    cell.className = 'card';
    cell.setAttribute('role','gridcell');
    cell.setAttribute('aria-label','Hidden card');
    cell.dataset.index = String(index);

    const inner = document.createElement('div');
    inner.className = 'card__inner';

    const front = document.createElement('div');
    front.className = 'card__face card__face--front';

    const back = document.createElement('div');
    back.className = 'card__face card__face--back';
    back.textContent = card.symbol;

    inner.appendChild(front); inner.appendChild(back);
    cell.appendChild(inner);
    cell.addEventListener('click', onFlip);
    frag.appendChild(cell);
  });
  board.appendChild(frag);
}

function setBoardSize(size){
  state.size = size;
  if(size === 6) board.dataset.size = '6'; else board.removeAttribute('data-size');
}

function onFlip(e){
  const btn = e.currentTarget;
  if(state.lock || btn.classList.contains('is-flipped')) return;

  if(!state.started){ state.started = true; startTimer(); }

  btn.classList.add('is-flipped');
  const idx = Number(btn.dataset.index);
  if(!state.first){
    state.first = { idx, el: btn };
  } else {
    state.second = { idx, el: btn };
    state.lock = true;
    state.moves += 1; movesEl.textContent = String(state.moves);

    const a = state.deck[state.first.idx];
    const b = state.deck[state.second.idx];
    const isMatch = a.symbol === b.symbol;

    if(isMatch){
      markMatched(state.first.el, state.second.el);
      clearTurn();
      state.matches += 1;
      checkWin();
    } else {
      setTimeout(() => {
        state.first.el.classList.remove('is-flipped');
        state.second.el.classList.remove('is-flipped');
        clearTurn();
      }, 700);
    }
  }
}

function markMatched(a,b){
  a.classList.add('matched');
  b.classList.add('matched');
  a.setAttribute('aria-label','Matched card');
  b.setAttribute('aria-label','Matched card');
}

function clearTurn(){
  state.first = null; state.second = null; state.lock = false;
}

function checkWin(){
  const pairs = (state.size*state.size)/2;
  if(state.matches >= pairs){
    stopTimer();
    maybeUpdateBest();
    updateBestLabel();
    const elapsed = Date.now() - state.startTime;
    winMoves.textContent = String(state.moves);
    winTime.textContent = formatTime(elapsed);
    winBoard.textContent = `${state.size}x${state.size}`;
    if(typeof winModal.showModal === 'function') winModal.showModal();
  }
}

function newGame({ size = state.size, theme = state.theme } = {}){
  setBoardSize(size);
  state.theme = theme;
  resetState();
  buildDeck();
  renderBoard();
  updateBestLabel();
}

restartBtn.addEventListener('click', () => newGame({ size: state.size, theme: state.theme }));
sizeSelect.addEventListener('change', (e) => newGame({ size: Number(e.target.value), theme: state.theme }));
themeSelect.addEventListener('change', (e) => newGame({ size: state.size, theme: e.target.value }));
playAgainBtn.addEventListener('click', (e) => { e.preventDefault(); newGame({ size: state.size, theme: state.theme }); winModal.close(); });

// Init
(function init(){
  // Read persisted best to show label
  updateBestLabel();
  newGame();
})();
