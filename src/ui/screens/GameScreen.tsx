import { Panel, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { labels } from '../../game/theme';
import type { ActionType, GameLogEntry, PlayerPublicState, PrivatePlayerState, PrivatePrompt, PublicGameState, Role } from '../../game/types';
import { ActionLog } from '../components/ActionLog';
import { BurnConnectionModal } from '../components/BurnConnectionModal';
import { JugaadReturnModal } from '../components/JugaadReturnModal';
import { PrivateHand } from '../components/PrivateHand';
import { PlayerDecisionPanel } from '../components/PlayerDecisionPanel';
import { PublicPlayerTable } from '../components/PublicPlayerTable';
import { StatusFooter } from '../components/StatusFooter';
import { TargetPickerModal } from '../components/TargetPickerModal';
import { isTargetedAction } from '../actionRouting';

type GameScreenProps = {
  currentScene: string;
  phaseLabel: string;
  publicState: PublicGameState | null;
  tableInstruction: string;
  waitingContext: string;
  nextStep: string;
  actionGuidance: string;
  responseGuidance: string;
  publicPlayers: PlayerPublicState[];
  activePlayerName: string | null;
  privateState: PrivatePlayerState | null;
  prompt: PrivatePrompt;
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
  publicState,
  tableInstruction,
  waitingContext,
  nextStep,
  actionGuidance,
  responseGuidance,
  publicPlayers,
  activePlayerName,
  privateState,
  prompt,
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
      <section className="hero-grid">
        <PlayerDecisionPanel
          currentScene={currentScene}
          phaseLabel={phaseLabel}
          tableInstruction={tableInstruction}
          waitingContext={waitingContext}
          nextStep={nextStep}
          activePlayerName={activePlayerName}
          actions={privateState?.availableActions ?? []}
          currentRupees={privateState?.rupees}
          prompt={prompt}
          onActionClick={onActionClick}
          forcedActionType={forcedActionType}
          actionGuidance={actionGuidance}
          responseGuidance={responseGuidance}
          onChallenge={onChallenge}
          onPassChallenge={onPassChallenge}
          onPassBlock={onPassBlock}
          onBlockRole={onChooseBlockRole}
          onOpenRules={onOpenRules}
        />

        {privateState ? (
          <PrivateHand
            playerId={privateState.playerId}
            rupees={privateState.rupees}
            hiddenConnections={privateState.hiddenConnections}
            availableActions={privateState.availableActions}
            isTurn={privateState.isTurn}
            eliminated={privateState.eliminated}
            pendingBurn={prompt?.type === 'BURN_CONNECTION'}
            pendingJugaad={prompt?.type === 'JUGAAD_RETURN'}
          />
        ) : (
          <Panel eyebrow="Private" title="Your snapshot">
            <p>Join a room to see your private snapshot.</p>
          </Panel>
        )}
      </section>

      <section className="game-table-grid">
        <div
          className="table-surface"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(4, 8, 16, 0.72), rgba(4, 8, 16, 0.92)), url(${GAME_ASSETS.backgrounds.darkTable})` }}
        >
          <PublicPlayerTable currentScene={currentScene} players={publicPlayers} publicState={publicState} />
        </div>

        <div className="table-surface table-surface--log table-surface--quiet">
          <ActionLog entries={publicLog} />
        </div>
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

      {prompt?.type === 'BURN_CONNECTION' && privateState ? <BurnConnectionModal hiddenConnections={privateState.hiddenConnections} onBurn={onChooseBurn} /> : null}

      {prompt?.type === 'JUGAAD_RETURN' && privateState ? (
        <JugaadReturnModal
          hiddenConnections={privateState.hiddenConnections}
          drawnConnections={prompt.drawnConnections}
          selectedIds={jugaadSelectedIds}
          onToggle={onToggleJugaad}
          onSubmit={onSubmitJugaad}
        />
      ) : null}

      <StatusFooter mode={mode} onLeaveRoom={onLeaveRoom} />
    </Stack>
  );
}
