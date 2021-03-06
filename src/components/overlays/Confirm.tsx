import classnames from 'classnames';
import _ from 'lodash';
import { inject, observer } from 'mobx-react';
import React from 'react';
import ButtonType from '~/enums/buttonType';
import { ConfirmStore } from '~/stores/confirmStore';
import { Button } from '../controls';
import RoutePathConfirm from '../sidebar/routeListView/RoutePathConfirm';
import RemoveRoutePathConfirm from '../sidebar/routePathView/routePathInfoTab/RemoveRoutePathConfirm';
import UnmeasuredStopGapsConfirm from '../sidebar/routePathView/routePathInfoTab/UnmeasuredStopGapsConfirm';
import SplitConfirm from '../sidebar/splitLinkView/SplitConfirm';
import ModalContainer from './ModalContainer';
import SavePrompt from './SavePrompt';
import * as s from './confirm.scss';

interface IConfirmProps {
    confirmStore?: ConfirmStore;
}

const Confirm = inject('confirmStore')(
    observer((props: IConfirmProps) => {
        const displayDoubleConfirm = () => {
            const confirmStore = props.confirmStore!;
            const isOk = confirm(confirmStore.doubleConfirmText!);
            if (isOk) {
                confirmStore!.confirm();
            }
        };

        const confirmStore = props.confirmStore!;
        const doubleConfirmText = props.confirmStore!.doubleConfirmText;
        const shouldShowDoubleConfirm = !_.isEmpty(doubleConfirmText);
        const isConfirmButtonDisabled = confirmStore.isConfirmButtonDisabled;
        const confirmType = confirmStore.confirmType;
        const confirmButtonClassName =
            confirmType === 'save'
                ? s.saveButton
                : confirmType === 'delete'
                ? s.deleteButton
                : undefined;
        const confirmComponentName = confirmStore.confirmComponentName;
        const confirmData = confirmStore.confirmData;

        if (!confirmStore.isOpen) return null;

        return (
            <ModalContainer>
                <div className={s.confirmView} data-cy='confirmView'>
                    <div className={classnames(s.content)}>
                        {
                            {
                                default: <div className={s.padding}>{confirmData}</div>,
                                savePrompt: <SavePrompt {...(confirmData as any)} />,
                                routePathConfirm: <RoutePathConfirm {...(confirmData as any)} />,
                                unmeasuredStopGapsConfirm: (
                                    <UnmeasuredStopGapsConfirm {...(confirmData as any)} />
                                ),
                                removeRoutePathConfirm: (
                                    <RemoveRoutePathConfirm {...(confirmData as any)} />
                                ),
                                splitConfirm: <SplitConfirm {...(confirmData as any)} />,
                            }[confirmComponentName]
                        }
                    </div>
                    <div className={s.buttonWrapper}>
                        {confirmStore!.confirmNotification && (
                            <div className={s.confirmNotification}>
                                {confirmStore!.confirmNotification}
                            </div>
                        )}
                        <div className={s.buttons}>
                            <Button
                                type={ButtonType.SQUARE}
                                onClick={confirmStore!.cancel}
                                isWide={true}
                                data-cy='cancelButton'
                            >
                                {confirmStore!.cancelButtonText}
                            </Button>
                            <Button
                                className={confirmButtonClassName}
                                disabled={isConfirmButtonDisabled}
                                type={ButtonType.SQUARE}
                                onClick={
                                    shouldShowDoubleConfirm
                                        ? displayDoubleConfirm
                                        : confirmStore!.confirm
                                }
                                isWide={true}
                                data-cy='confirmButton'
                            >
                                {confirmStore!.confirmButtonText}
                            </Button>
                        </div>
                    </div>
                </div>
            </ModalContainer>
        );
    })
);

export default Confirm;
