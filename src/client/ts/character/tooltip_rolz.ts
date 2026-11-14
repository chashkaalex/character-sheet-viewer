import { characterRep } from '../state';
import { enterCombat, checkActionCostWithPrompt, consumeActionCost, getRoundState, ActionCostType, canUseAooWithPrompt, consumeAoo } from '../round_actions';
import { updateAttacksOfOpportunityDisplay } from '../dashboard/combat';

export function UpdateValueAndTooltip(element, property) {
  const value = property.bonus !== undefined ? property.bonus : (property.currentScore !== undefined ? property.currentScore : '-');
  document.getElementById(element).innerHTML = value;
  if (property) {
    addTooltip(element, property.string, property.rolzRollMessage);
  }
}


// Custom Tooltip Logic
let activeTooltipElement = null;

export function addTooltip(element, tooltipText, rolzRollMessage?: string) {
  // If element is an ID string, get the element
  if (typeof element === 'string') {
    element = document.getElementById(element);
  }

  if (element && tooltipText) {
    // Remove native title to prevent default browser tooltip
    element.removeAttribute('title');
    element.dataset.tooltip = tooltipText;
    if (rolzRollMessage) {
      element.dataset.rolzRollMessage = rolzRollMessage;
    } else {
      delete element.dataset.rolzRollMessage;
    }
    element.style.cursor = 'help';

    // Only bind event listeners once per DOM element to prevent duplicate click toggles
    if (element.dataset.tooltipBound === 'true') {
      if (activeTooltipElement === element) {
        showTooltip(element);
      }
      return;
    }
    element.dataset.tooltipBound = 'true';

    // Desktop: Hover events
    element.addEventListener('mouseenter', function () {
      if (activeTooltipElement && !document.body.contains(activeTooltipElement)) {
        activeTooltipElement = null;
      }
      // If a tooltip is locked by click, keep it open until explicitly dismissed or another is clicked
      if (activeTooltipElement) {
        return;
      }
      showTooltip(this);
    });

    element.addEventListener('mouseleave', function () {
      if (activeTooltipElement && !document.body.contains(activeTooltipElement)) {
        activeTooltipElement = null;
      }
      // Only hide on mouseleave when no tooltip is locked by click
      if (!activeTooltipElement) {
        hideTooltip();
      }
    });

    // Click to lock/unlock tooltip
    element.addEventListener('click', function (e) {
      e.stopPropagation(); // Prevent document click from immediately hiding it

      if (activeTooltipElement === this) {
        // If clicking the locked element, unlock and hide
        hideTooltip();
        activeTooltipElement = null;
      } else {
        // Lock this element
        activeTooltipElement = this;
        showTooltip(this);
      }
    });
  }
}

export function showTooltip(element) {
  const tooltip = document.getElementById('custom-tooltip');
  const text = element.dataset.tooltip;

  if (!tooltip || !text) return;

  tooltip.innerHTML = '';
  const textDiv = document.createElement('div');
  textDiv.textContent = text;
  tooltip.appendChild(textDiv);

  const rollMessage = element.dataset.rolzRollMessage;
  if (rollMessage) {
    const divider = document.createElement('hr');
    divider.className = 'tooltip-divider';
    tooltip.appendChild(divider);

    if (characterRep && characterRep.rolzRoomId) {
      const btnGroup = document.createElement('div');
      btnGroup.className = 'tooltip-btn-group';

      const rollBtn = document.createElement('button');
      rollBtn.className = 'tooltip-roll-btn';
      rollBtn.innerHTML = `🎲 <span class="roll-expr">Roll to Rolz (${characterRep.rolzRoomId})</span>`;
      rollBtn.title = `Click to roll ${rollMessage} directly in room ${characterRep.rolzRoomId}`;

      rollBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        if (element.id === 'attacksOfOpportunity' && characterRep?.docId) {
          const maxAoo = Math.max(0, Number(characterRep.attacksOfOpportunity?.bonus ?? 1));
          if (!canUseAooWithPrompt(characterRep.docId, maxAoo)) {
            return;
          }
        }
        const attackMode = element.dataset.attackMode as ActionCostType | undefined;
        if (attackMode && characterRep?.docId) {
          const isFollowUp = attackMode === 'full-round' && getRoundState(characterRep.docId).fullAttackInProgress;
          if (!checkActionCostWithPrompt(characterRep.docId, attackMode, { isFullAttackFollowUp: isFollowUp })) {
            return;
          }
        }

        rollBtn.disabled = true;
        rollBtn.textContent = '🎲 Rolling...';

        // @ts-ignore
        google.script.run
          .withSuccessHandler((responseStr: string) => {
            rollBtn.disabled = false;
            rollBtn.innerHTML = `🎲 <span class="roll-expr">Roll to Rolz (${characterRep.rolzRoomId})</span>`;

            try {
              const res = JSON.parse(responseStr);
              const items = res.message?.content?.items;
              if (items && items.length > 0) {
                if (characterRep?.docId) {
                  if (element.id === 'initBonus') {
                    const initVal = parseInt(items[0].result, 10);
                    enterCombat(characterRep.docId, isNaN(initVal) ? null : initVal);
                    updateAttacksOfOpportunityDisplay();
                  } else if (element.id === 'attacksOfOpportunity') {
                    consumeAoo(characterRep.docId, 'Attack of Opportunity');
                    updateAttacksOfOpportunityDisplay();
                  } else if (element.dataset.attackMode === 'standard') {
                    consumeActionCost(characterRep.docId, element.dataset.attackLabel || 'Weapon Attack', 'standard');
                  } else if (element.dataset.attackMode === 'full-round') {
                    const isFollowUp = getRoundState(characterRep.docId).fullAttackInProgress;
                    consumeActionCost(characterRep.docId, element.dataset.attackLabel || 'Full Attack', 'full-round', {
                      isFullAttack: true,
                      isFullAttackFollowUp: isFollowUp,
                      attackId: element.id
                    });
                  }
                }
                if (items.length === 1) {
                  const item = items[0];
                  const resultVal = item.result;
                  const detailsVal = item.details || '';
                  const preVal = item.pre || '';
                  const commentVal = item.comment || '';
                  const label = preVal || (commentVal ? `${commentVal}: ` : '');
                  alert(`Roll Result: ${label}${resultVal} ${detailsVal}`);
                } else {
                  let total = 0;
                  const lines = items.map((it: any, idx: number) => {
                    const val = parseInt(it.result);
                    if (!isNaN(val)) total += val;

                    let tag = '';
                    const nextPre = items[idx + 1]?.pre || '';
                    const currPost = it.post || '';
                    const matchNext = nextPre.match(/\(([^)]+)\)/);
                    const matchPost = currPost.match(/\(([^)]+)\)/);

                    if (matchNext) {
                      tag = matchNext[1];
                    } else if (matchPost) {
                      tag = matchPost[1];
                    } else if (idx === 0) {
                      tag = 'Physical';
                    } else {
                      tag = `Extra ${idx}`;
                    }

                    let detailsStr = '';
                    if (it.details) {
                      const trimmed = it.details.trim();
                      detailsStr = trimmed.startsWith('(') && trimmed.endsWith(')') ? ` ${trimmed}` : ` (${trimmed})`;
                    }
                    return `• ${tag}: ${it.result}${detailsStr}`;
                  });

                  const title = (items[0]?.pre || '').split(':')[0]?.trim() || 'Damage Roll';
                  alert(`🎲 ${title}\n────────────────────────\n${lines.join('\n')}\n────────────────────────\nTotal: ${total}`);
                }
              } else {
                alert(`API response did not contain a roll: ${responseStr}`);
              }
            } catch (err: any) {
              console.error(err);
              alert(`Error parsing Rolz response: ${err.message}\nRaw: ${responseStr}`);
            }
          })
          .withFailureHandler((err: any) => {
            rollBtn.disabled = false;
            rollBtn.innerHTML = `🎲 <span class="roll-expr">Roll to Rolz (${characterRep.rolzRoomId})</span>`;
            alert(`Error communicating with server: ${err.message}`);
          })
          .PostRollToRolz(characterRep.rolzRoomId, rollMessage, characterRep.name);
      });

      const copyBtn = document.createElement('button');
      copyBtn.className = 'tooltip-roll-btn tooltip-copy-btn';
      copyBtn.innerHTML = '📋 <span class="roll-expr">Copy</span>';
      copyBtn.title = `Click to copy Rolz command (${rollMessage})`;

      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(rollMessage).then(() => {
          showToast(`Copied roll code: ${rollMessage}`);
        }).catch(err => {
          console.error('Could not copy text: ', err);
        });
      });

      btnGroup.appendChild(rollBtn);
      btnGroup.appendChild(copyBtn);
      tooltip.appendChild(btnGroup);
    } else {
      const rollBtn = document.createElement('button');
      rollBtn.className = 'tooltip-roll-btn';
      rollBtn.innerHTML = `🎲 <span class="roll-expr">${rollMessage}</span>`;
      rollBtn.title = 'Click to copy Rolz command';

      rollBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid closing/toggling
        navigator.clipboard.writeText(rollMessage).then(() => {
          showToast(`Copied roll code: ${rollMessage}`);
        }).catch(err => {
          console.error('Could not copy text: ', err);
        });
      });
      tooltip.appendChild(rollBtn);
    }
  }

  tooltip.classList.add('show');

  // Position logic
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Default: Top center
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

  // Check bounds and adjust
  // If too high (off screen), move to bottom
  if (top < 0) {
    top = rect.bottom + 10;
  }

  // If too far left
  if (left < 10) {
    left = 10;
  }

  // If too far right
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  tooltip.style.top = `${top + window.scrollY}px`;
  tooltip.style.left = `${left + window.scrollX}px`;
}

export function hideTooltip() {
  const tooltip = document.getElementById('custom-tooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
  }
}

export function showToast(message: string) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger transition
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}

// Close tooltip when clicking anywhere else (outside the locked element and outside the tooltip box)
if (typeof document !== 'undefined') {
  document.addEventListener('click', function (e) {
    const tooltip = document.getElementById('custom-tooltip');
    if (
      activeTooltipElement &&
      !activeTooltipElement.contains(e.target as Node) &&
      (!tooltip || !tooltip.contains(e.target as Node))
    ) {
      hideTooltip();
      activeTooltipElement = null;
    }
  });
}

