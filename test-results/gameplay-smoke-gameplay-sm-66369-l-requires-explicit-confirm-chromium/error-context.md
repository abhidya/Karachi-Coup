# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay-smoke.spec.ts >> gameplay smoke >> gameplay: Burn Connection modal requires explicit confirm
- Location: tests/e2e/gameplay-smoke.spec.ts:132:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('response-block-MUMMA')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('response-block-MUMMA')

```

```yaml
- main:
  - paragraph: Karachi Coup
  - heading "Bluff. Setting. Rupees. Full Beizzati." [level=1]
  - paragraph: Host runs the table. Players join by room code. Hidden Connections stay private, public snapshots stay clean, and every response prompt is driven by the host-authoritative PeerJS room.
  - text: synced Turn Start · Host One is choosing a scene. server:private:TURN_START
  - img "Current scene"
  - paragraph: Turn Start
  - heading "Host One is choosing a scene." [level=2]
  - paragraph:
    - text: "Turn:"
    - strong: Host One
  - button "Rules"
  - paragraph: Private
  - heading "Your Connections" [level=2]
  - text: T4PD2-d0d2ea2e 2₹ 2 hidden
  - paragraph:
    - text: "Elimination:"
    - strong: Alive
  - paragraph:
    - text: "Actions:"
    - strong: None
  - button "Malik Saab Malik Saab" [disabled]:
    - img "Malik Saab"
    - text: Malik Saab
  - button "Zardaar Chor Zardaar Chor" [disabled]:
    - img "Zardaar Chor"
    - text: Zardaar Chor
  - paragraph: Waiting for your turn.
  - paragraph: Actions
  - heading "Your move" [level=2]
  - paragraph: No legal actions now.
  - paragraph: Public table
  - heading "Table roster" [level=2]
  - img "Current scene"
  - paragraph: Host One is choosing a scene.
  - list:
    - listitem:
      - strong: Host One
      - text: T4PD2-9f9caaca Turn 2 Rupees
    - listitem:
      - strong: Ari
      - text: T4PD2-d0d2ea2e Ready 2 Rupees
    - listitem:
      - strong: Bea
      - text: T4PD2-67900802 Ready 2 Rupees
  - paragraph: Response
  - heading "Waiting for the table" [level=2]
  - paragraph: Host-authoritative PeerJS. The host owns hidden state and validates every intent.
  - paragraph: Log
  - heading "Action log" [level=2]
  - button "Expand log"
  - paragraph: Recent scene history is tucked away to save space.
  - button "Leave room"
  - text: client
  - button "Leave room"
  - text: client
```

# Test source

```ts
  40  |   await expect(activePage.getByTestId('private-panel')).toBeVisible();
  41  |   await expect(activePage.getByTestId('public-player-table')).toBeVisible();
  42  |   await expect(activePage.getByTestId('action-log')).toBeVisible();
  43  | 
  44  |   await hostContext.close();
  45  |   await playerOneContext.close();
  46  |   await playerTwoContext.close();
  47  | });
  48  | 
  49  | test('gameplay: active player can take Chai Paisa and rupees update', async ({ browser }) => {
  50  |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  51  |   const name = await activePlayerName(hostPage);
  52  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  53  | 
  54  |   await activePage.getByTestId('action-button-CHAI_PAISA').click();
  55  |   await waitForTurnName(hostPage, name === 'Ari' ? 'Bea' : 'Ari');
  56  |   await expect(activePage.getByTestId('private-panel')).toContainText('3₹');
  57  | 
  58  |   await hostContext.close();
  59  |   await playerOneContext.close();
  60  |   await playerTwoContext.close();
  61  | });
  62  | 
  63  | test('gameplay: Kiraya Collection does not open target picker', async ({ browser }) => {
  64  |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  65  |   const name = await activePlayerName(hostPage);
  66  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  67  | 
  68  |   await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  69  |   await expect(activePage.getByTestId('target-picker')).toHaveCount(0);
  70  | 
  71  |   await hostContext.close();
  72  |   await playerOneContext.close();
  73  |   await playerTwoContext.close();
  74  | });
  75  | 
  76  | test('gameplay: challenge prompt shows Call Bakwaas and Let It Slide', async ({ browser }) => {
  77  |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  78  |   const name = await activePlayerName(hostPage);
  79  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  80  |   const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;
  81  | 
  82  |   await activePage.getByTestId('action-button-KIRAYA_COLLECTION').click();
  83  |   await expect(otherPage.getByTestId('response-call-bakwaas')).toBeVisible();
  84  |   await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();
  85  | 
  86  |   await hostContext.close();
  87  |   await playerOneContext.close();
  88  |   await playerTwoContext.close();
  89  | });
  90  | 
  91  | test('gameplay: Police Wala Raid opens target picker', async ({ browser }) => {
  92  |   const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  93  |   const name = await activePlayerName(hostPage);
  94  |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  95  | 
  96  |   await activePage.getByTestId('action-button-POLICE_WALA_RAID').click();
  97  |   await expect(activePage.getByTestId('target-picker')).toBeVisible();
  98  | 
  99  |   await hostContext.close();
  100 |   await playerOneContext.close();
  101 |   await playerTwoContext.close();
  102 | });
  103 | 
  104 | test('gameplay: block prompt shows only legal Use Setting roles', async ({ browser }) => {
  105 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  106 |   const name = await activePlayerName(hostPage);
  107 |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  108 |   const otherPage = activePage === playerOnePage ? playerTwoPage : playerOnePage;
  109 | 
  110 |   await activePage.getByTestId('action-button-RISHTEDAAR_HELP').click();
  111 |   await expect(otherPage.getByTestId('response-block-MALIK_SAAB')).toBeVisible();
  112 |   await expect(otherPage.getByTestId('response-let-it-slide')).toBeVisible();
  113 | 
  114 |   await hostContext.close();
  115 |   await playerOneContext.close();
  116 |   await playerTwoContext.close();
  117 | });
  118 | 
  119 | test('gameplay: Bhai Ka Scene opens target picker', async ({ browser }) => {
  120 |   const { hostContext, playerOneContext, playerTwoContext, hostPage, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  121 |   const name = await activePlayerName(hostPage);
  122 |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  123 | 
  124 |   await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  125 |   await expect(activePage.getByTestId('target-picker')).toBeVisible();
  126 | 
  127 |   await hostContext.close();
  128 |   await playerOneContext.close();
  129 |   await playerTwoContext.close();
  130 | });
  131 | 
  132 | test('gameplay: Burn Connection modal requires explicit confirm', async ({ browser }) => {
  133 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  134 |   const activeName = await activePlayerName(hostPage);
  135 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  136 | 
  137 |   await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  138 |   const targetName = await selectFirstTarget(activePage);
  139 |   const responderPage = await pageForPlayerName(targetName, hostPage, playerOnePage, playerTwoPage);
> 140 |   await expect(responderPage.getByTestId('response-block-MUMMA')).toBeVisible({ timeout: 10_000 });
      |                                                                   ^ Error: expect(locator).toBeVisible() failed
  141 |   await expect(responderPage.getByTestId('response-let-it-slide')).toBeVisible();
  142 |   await responderPage.getByTestId('response-let-it-slide').click();
  143 |   const burnPage = await visiblePageWithTestId('burn-modal', [hostPage, playerOnePage, playerTwoPage]);
  144 |   await expect(burnPage.getByRole('button', { name: 'Confirm burn' })).toBeDisabled();
  145 | 
  146 |   await hostContext.close();
  147 |   await playerOneContext.close();
  148 |   await playerTwoContext.close();
  149 | });
  150 | 
  151 | test('gameplay: Full Beizzati opens target picker when affordable', async ({ browser }) => {
  152 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  153 | 
  154 |   const nextTurnName = (name: string) => (name === 'Host One' ? 'Ari' : name === 'Ari' ? 'Bea' : 'Host One');
  155 |   let expectedActiveName = await activePlayerName(hostPage);
  156 | 
  157 |   for (let index = 0; index < 15; index += 1) {
  158 |     const activePage = await pageForActivePlayer(expectedActiveName, hostPage, playerOnePage, playerTwoPage);
  159 |     await activePage.getByTestId('action-button-CHAI_PAISA').click();
  160 |     expectedActiveName = nextTurnName(expectedActiveName);
  161 |     await waitForTurnName(hostPage, expectedActiveName);
  162 |   }
  163 | 
  164 |   const name = expectedActiveName;
  165 |   const activePage = await pageForActivePlayer(name, hostPage, playerOnePage, playerTwoPage);
  166 |   await expect(activePage.getByTestId('action-button-FULL_BEIZZATI')).toBeVisible();
  167 |   await activePage.getByTestId('action-button-FULL_BEIZZATI').click();
  168 |   await expect(activePage.getByTestId('target-picker')).toBeVisible();
  169 | 
  170 |   await hostContext.close();
  171 |   await playerOneContext.close();
  172 |   await playerTwoContext.close();
  173 | });
  174 | 
  175 | test('gameplay: Zardaar Jugaad modal requires exactly two returned Connections', async ({ browser }) => {
  176 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  177 |   const activeName = await activePlayerName(hostPage);
  178 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  179 | 
  180 |   await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  181 |   const firstResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage));
  182 |   await firstResponderPage.getByTestId('response-let-it-slide').click();
  183 |   const secondResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage && page !== firstResponderPage));
  184 |   await secondResponderPage.getByTestId('response-let-it-slide').click();
  185 |   await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();
  186 |   await expect(activePage.getByTestId('jugaad-submit-return')).toBeDisabled();
  187 | 
  188 |   await hostContext.close();
  189 |   await playerOneContext.close();
  190 |   await playerTwoContext.close();
  191 | });
  192 | 
  193 | test('gameplay: Zardaar Jugaad opens return modal after challenge passes', async ({ browser }) => {
  194 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  195 |   const activeName = await activePlayerName(hostPage);
  196 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  197 | 
  198 |   await activePage.getByTestId('action-button-ZARDAAR_JUGAAD').click();
  199 |   const firstResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage));
  200 |   await firstResponderPage.getByTestId('response-let-it-slide').click();
  201 |   const secondResponderPage = await visiblePageWithTestId('response-let-it-slide', [hostPage, playerOnePage, playerTwoPage].filter((page) => page !== activePage && page !== firstResponderPage));
  202 |   await secondResponderPage.getByTestId('response-let-it-slide').click();
  203 |   await expect(activePage.getByTestId('jugaad-modal')).toBeVisible();
  204 | 
  205 |   await hostContext.close();
  206 |   await playerOneContext.close();
  207 |   await playerTwoContext.close();
  208 | });
  209 | 
  210 | test('visual: opponent hidden Connections render as card backs, not role cards', async ({ browser }) => {
  211 |   const { hostContext, hostPage, playerOneContext, playerTwoContext } = await createThreePlayerGame(browser);
  212 | 
  213 |   await expect(hostPage.getByTestId('player-hidden-count').locator('.card-stack--hidden')).toHaveCount(6);
  214 |   await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(0);
  215 | 
  216 |   await hostContext.close();
  217 |   await playerOneContext.close();
  218 |   await playerTwoContext.close();
  219 | });
  220 | 
  221 | test('visual: burned Connections render actual role art with burned overlay', async ({ browser }) => {
  222 |   const { hostContext, hostPage, playerOneContext, playerTwoContext, playerOnePage, playerTwoPage } = await createThreePlayerGame(browser);
  223 |   const activeName = await activePlayerName(hostPage);
  224 |   const activePage = await pageForActivePlayer(activeName, hostPage, playerOnePage, playerTwoPage);
  225 | 
  226 |   await activePage.getByTestId('action-button-BHAI_KA_SCENE').click();
  227 |   const targetName = await selectFirstTarget(activePage);
  228 |   const responderPage = await pageForPlayerName(targetName, hostPage, playerOnePage, playerTwoPage);
  229 |   await expect(responderPage.getByTestId('response-block-MUMMA')).toBeVisible({ timeout: 10_000 });
  230 |   await expect(responderPage.getByTestId('response-let-it-slide')).toBeVisible();
  231 |   await responderPage.getByTestId('response-let-it-slide').click();
  232 |   const burnPage = await visiblePageWithTestId('burn-modal', [hostPage, playerOnePage, playerTwoPage]);
  233 |   await burnPage.getByTestId('burn-connection-option').first().click();
  234 |   await expect(burnPage.getByRole('button', { name: 'Confirm burn' })).toBeEnabled();
  235 |   await burnPage.getByRole('button', { name: 'Confirm burn' }).click();
  236 |   await expect(hostPage.getByTestId('player-revealed-connections').locator('img')).toHaveCount(3);
  237 | 
  238 |   await hostContext.close();
  239 |   await playerOneContext.close();
  240 |   await playerTwoContext.close();
```