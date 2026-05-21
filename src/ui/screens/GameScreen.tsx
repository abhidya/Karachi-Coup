import { Button, Panel, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { labels } from '../../game/theme';
import type { ActionType, GameLogEntry, PendingBurn, PendingJugaad, PlayerPublicState, PrivatePlayerState, Role } from '../../game/types';
import { ActionLog } from '../components/ActionLog';
import { ActionPanel } from '../components/ActionPanel';
import { BurnConnectionModal } from '../components/BurnConnectionModal';
import { JugaadReturnModal } from '../components/JugaadReturnModal';
import { PrivateHand } from '../components/PrivateHand';
import { PublicPlayerTable } from '../components/PublicPlayerTable';
import { ResponsePanel } from '../components/ResponsePanel';
import { StatusFooter } from '../components/StatusFooter';
import { TargetPickerModal } from '../components/TargetPickerModal';
import { isTargetedAction } from '../actionRouting';

type GameScreenProps = {
  currentScene: string;
  phaseLabel: string;
  publicPlayers: PlayerPublicState[];
  activePlayerName: string | null;
  privateState: PrivatePlayerState | null;
  promptKind: 'idle' | 'challenge' | 'block' | 'block-challenge';
  promptLabel?: string;
  eligibleBlockRoles: Role[];
  activeBurnPrompt: PendingBurn | null;
  activeJugaadPrompt: PendingJugaad | null;
  pendingActionType: ActionType | null;
  pendingTargetId: string;
  livingOpponents: PlayerPublicState[];
  publicLog: GameLogEntry[];
  mode: string;
  jugaadSelectedIds: string[];
  forcedActionType: ActionType | null;
  onActionClick: (actionType: ActionType) => void;
  onChallenge: () => void;
  onPassChallenge: () => void;
  onPassBlock: () => void;
  onChooseBlockRole: (role: Role) => void;
  onChooseBurn: (connectionId: string) => void;
  onToggleJugaad: (connectionId: string) => void;
  onSubmitJugaad: () => void;
  onSelectTarget: (playerId: string) => void;
  onConfirmTarget: () => void;
  onCancelTarget: () => void;
  onLeaveRoom: () => void;
  onOpenRules: () => void;
};

export function GameScreen({
  currentScene,
  phaseLabel,
  publicPlayers,
  activePlayerName,
  privateState,
  promptKind,
  promptLabel,
  eligibleBlockRoles,
  activeBurnPrompt,
  activeJugaadPrompt,
  pendingActionType,
  pendingTargetId,
  livingOpponents,
  publicLog,
  mode,
  jugaadSelectedIds,
  forcedActionType,
  onActionClick,
  onChallenge,
  onPassChallenge,
  onPassBlock,
  onChooseBlockRole,
  onChooseBurn,
  onToggleJugaad,
  onSubmitJugaad,
  onSelectTarget,
  onConfirmTarget,
  onCancelTarget,
  onLeaveRoom,
  onOpenRules,
}: GameScreenProps) {
  return (
    <Stack gap="lg">
      <section className="scene-banner panel panel--banner">
        <Row align="center" wrap>
          <img className="badge-icon badge-icon--large" src={GAME_ASSETS.badges.currentScene} alt="Current scene" />
          <div>
            <p className="eyebrow">{phaseLabel}</p>
            <h2 data-testid="current-scene">{currentScene}</h2>
            <p className="muted">Turn: <strong data-testid="active-player-name">{activePlayerName ?? 'Waiting'}</strong></p>
          </div>
          <div className="scene-banner__actions">
            <Button variant="secondary" onClick={onOpenRules}>
              Rules
            </Button>
          </div>
        </Row>
      </section>

      <section className="hero-grid">
        {privateState ? (
          <PrivateHand
            playerId={privateState.playerId}
            rupees={privateState.rupees}
            hiddenConnections={privateState.hiddenConnections}
            availableActions={privateState.availableActions}
            isTurn={privateState.isTurn}
            eliminated={privateState.eliminated}
            pendingBurn={activeBurnPrompt}
            pendingJugaad={activeJugaadPrompt}
          />
        ) : (
          <Panel eyebrow="Private" title="Your snapshot">
            <p>Join a room to see your private snapshot.</p>
          </Panel>
        )}
        <ActionPanel actions={privateState?.availableActions ?? []} onActionClick={onActionClick} forcedActionType={forcedActionType} />
      </section>

      <div
        className="table-surface"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(4, 8, 16, 0.72), rgba(4, 8, 16, 0.92)), url(${GAME_ASSETS.backgrounds.darkTable})` }}
      >
        <PublicPlayerTable currentScene={currentScene} players={publicPlayers} />
      </div>

      <section className="hero-grid table-surface table-surface--log">
        <ResponsePanel
          promptKind={promptKind}
          promptLabel={promptLabel}
          blockRoles={eligibleBlockRoles}
          onChallenge={onChallenge}
          onPassChallenge={onPassChallenge}
          onPassBlock={onPassBlock}
          onBlockRole={onChooseBlockRole}
        />
        <ActionLog entries={publicLog} />
      </section>

      {pendingActionType && isTargetedAction(pendingActionType) ? (
        <TargetPickerModal
          actionLabel={labels.actionLabels[pendingActionType]}
          livingOpponents={livingOpponents}
          selectedTargetId={pendingTargetId}
          onSelect={onSelectTarget}
          onConfirm={onConfirmTarget}
          onCancel={onCancelTarget}
        />
      ) : null}

      {activeBurnPrompt && privateState ? <BurnConnectionModal hiddenConnections={privateState.hiddenConnections} onBurn={onChooseBurn} /> : null}

      {activeJugaadPrompt && privateState ? (
        <JugaadReturnModal
          hiddenConnections={privateState.hiddenConnections}
          drawnConnections={activeJugaadPrompt.drawnConnections}
          selectedIds={jugaadSelectedIds}
          onToggle={onToggleJugaad}
          onSubmit={onSubmitJugaad}
        />
      ) : null}

      <StatusFooter mode={mode} onLeaveRoom={onLeaveRoom} />
    </Stack>
  );
}
