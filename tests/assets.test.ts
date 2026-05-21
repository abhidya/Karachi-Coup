import { describe, expect, it } from 'vitest';
import { GAME_ASSETS } from '../src/game/assets';

describe('assets', () => {
  it('assets: every registered asset url is rooted under the Vite base path', () => {
    for (const value of Object.values(GAME_ASSETS)) {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        if (typeof nested === 'string') {
          expect(nested.startsWith(import.meta.env.BASE_URL)).toBe(true);
        }
      }
    }
  });

  it('assets: every role has a mapped image path', () => {
    expect(GAME_ASSETS.roles.malik).toContain('malik-saab.png');
    expect(GAME_ASSETS.roles.bhai).toContain('bhai.png');
    expect(GAME_ASSETS.roles.police).toContain('police-wala.png');
    expect(GAME_ASSETS.roles.zardaar).toContain('zardarr-chor.png');
    expect(GAME_ASSETS.roles.mumma).toContain('mumma.png');
  });

  it('assets: game art pack exposes a face-down card back and lobby hero image', () => {
    expect(GAME_ASSETS.cards.back).toContain('connection-back.png');
    expect(GAME_ASSETS.lobby.hostHero).toContain('host-lobby.png');
    expect(GAME_ASSETS.backgrounds.darkTable).toContain('seamless-dark-table.png');
    expect(GAME_ASSETS.backgrounds.marketWall).toContain('seamless-warm-market-wall.png');
  });

  it('assets: every action has a mapped image path', () => {
    expect(GAME_ASSETS.actions.income).toContain('chai-paisa.png');
    expect(GAME_ASSETS.actions.foreignAid).toContain('rishtedaar-help.png');
    expect(GAME_ASSETS.actions.tax).toContain('Kiraya-Collection.png');
    expect(GAME_ASSETS.actions.steal).toContain('police-walla-raide.png');
    expect(GAME_ASSETS.actions.assassinate).toContain('bhai-ka-scene.png');
    expect(GAME_ASSETS.actions.exchange).toContain('zardaar-juggad.png');
    expect(GAME_ASSETS.actions.coup).toContain('Full-Beizzati.png');
  });

  it('assets: every response has a mapped image path', () => {
    expect(GAME_ASSETS.responses.challenge).toContain('call-bakwas.png');
    expect(GAME_ASSETS.responses.pass).toContain('let-it-slide.png');
    expect(GAME_ASSETS.responses.block).toContain('use-setting.png');
    expect(GAME_ASSETS.responses.burn).toContain('burn-connection.png');
  });

  it('assets: every required background has a mapped image path', () => {
    expect(GAME_ASSETS.backgrounds.home).toContain('home-screen-bg.png');
    expect(GAME_ASSETS.backgrounds.lobby).toContain('host-lobby-bg.png');
    expect(GAME_ASSETS.backgrounds.table).toContain('game-table-bg.png');
    expect(GAME_ASSETS.backgrounds.gameOver).toContain('game-over-bg.png');
  });

  it('assets: every required rule card has a mapped image path', () => {
    expect(GAME_ASSETS.rules.quick).toContain('quick-rules.png');
    expect(GAME_ASSETS.rules.challenge).toContain('challenge-rules.png');
    expect(GAME_ASSETS.rules.block).toContain('block-rules.png');
    expect(GAME_ASSETS.rules.actionReference).toContain('action-reference.png');
  });

  it('assets: Untitled.png is documented as intentionally unused', () => {
    expect(GAME_ASSETS.unused.untitledBhaiPoster).toContain('Untitled.png');
  });
});
