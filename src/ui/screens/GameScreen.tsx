import { Panel, Row, Stack } from '../../components/Ui';
import { labels } from '../../game/theme';
import type { ActionType, GameLogEntry, PendingBurn, PendingChallenge, PendingJugaad, PlayerPublicState, PrivatePlayerState, Role } from '../../game/types';
import { ActionLog } from '../components/ActionLog';
import { ActionPanel } from '../components/ActionPanel';
import { BurnConnectionModal } from '../components/BurnConnectionModal';
import { JugaadReturnModal } from '../components/JugaadReturnModal';
import { PrivateHand } from '../components/PrivateHand';
import { PublicPlayerTable } from '../components/PublicPlayerTable';
import { ResponsePanel } from '../components/ResponsePanel';
import { StatusFooter } from '../components/StatusFooter';
import { TargetPickerModal } from '../components/TargetPickerModal';

type GameScreenProps = {
  currentScene: string;
  phaseLabel: string;
  publicPlayers: PlayerPublicState[];
  activePlayerName: string | null;
  privateState: PrivatePlayerState | null;
  challengePrompt: PendingChallenge | null;
  canSeeBlockPrompt: boolean;
  eligibleBlockRoles: Role[];
  activeBurnPrompt: PendingBurn | null;
  activeJugaadPrompt: PendingJugaad | null;
  pendingActionType: ActionType | null;
  pendingTargetId: string;
  livingOpponents: PlayerPublicState[];
  publicLog: GameLogEntry[];
  mode: string;
  jugaadSelectedIds: string[];
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
};

export function GameScreen({
  currentScene,
  phaseLabel,
  publicPlayers,
  activePlayerName,
  privateState,
  challengePrompt,
  canSeeBlockPrompt,
  eligibleBlockRoles,
  activeBurnPrompt,
  activeJugaadPrompt,
  pendingActionType,
  pendingTargetId,
  livingOpponents,
  publicLog,
  mode,
  jugaadSelectedIds,
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
}: GameScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Current scene" title={phaseLabel}>
          <Row>
            <span data-testid="current-scene">{currentScene}</span>
            <span data-testid="active-player-name">{activePlayerName ?? 'Waiting'}</span>
          </Row>
          <p>Game started</p>
        </Panel>
        <PublicPlayerTable currentScene={currentScene} players={publicPlayers} />
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
        <ActionPanel actions={privateState?.availableActions ?? []} onActionClick={onActionClick} />
      </section>

      <section className="hero-grid">
        <ResponsePanel
          canChallenge={Boolean(challengePrompt)}
          canBlock={canSeeBlockPrompt}
          blockRoles={eligibleBlockRoles}
          onChallenge={onChallenge}
          onPassChallenge={onPassChallenge}
          onPassBlock={onPassBlock}
          onBlockRole={onChooseBlockRole}
        />
        <ActionLog entries={publicLog} />
      </section>

      {pendingActionType ? (
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
