const baseUrl = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;
const asset = (file: string) => `${baseUrl}${file}`;

export const GAME_ASSETS = {
  roles: {
    malik: asset('malik-saab.png'),
    bhai: asset('bhai.png'),
    police: asset('police-wala.png'),
    zardaar: asset('zardarr-chor.png'),
    mumma: asset('mumma.png'),
  },
  actions: {
    income: asset('chai-paisa.png'),
    foreignAid: asset('rishtedaar-help.png'),
    tax: asset('Kiraya-Collection.png'),
    steal: asset('police-walla-raide.png'),
    assassinate: asset('bhai-ka-scene.png'),
    exchange: asset('zardaar-juggad.png'),
    coup: asset('Full-Beizzati.png'),
  },
  responses: {
    challenge: asset('call-bakwas.png'),
    pass: asset('let-it-slide.png'),
    block: asset('use-setting.png'),
    burn: asset('burn-connection.png'),
  },
  backgrounds: {
    home: asset('home-screen-bg.png'),
    lobby: asset('host-lobby-bg.png'),
    table: asset('game-table-bg.png'),
    gameOver: asset('game-over-bg.png'),
  },
  textures: {
    panel: asset('panel-texture.png'),
    strip: asset('decorative-strip-texture.png'),
  },
  slots: {
    hidden: asset('hidden-connection-slot.png'),
    revealed: asset('revealed-connection-spot.png'),
    burned: asset('burned.png'),
  },
  badges: {
    host: asset('host.png'),
    winner: asset('winner.png'),
    eliminated: asset('eliminated-player-icon.png'),
    currentScene: asset('current-scene.png'),
  },
  rules: {
    quick: asset('quick-rules.png'),
    challenge: asset('challenge-rules.png'),
    block: asset('block-rules.png'),
    actionReference: asset('action-reference.png'),
  },
} as const;

export type GameAssets = typeof GAME_ASSETS;
