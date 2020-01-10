import classnames from 'classnames';
import { inject, observer } from 'mobx-react';
import React, { ReactNode } from 'react';
import { FiArrowLeft, FiEdit3, FiXCircle } from 'react-icons/fi';
import navigator from '~/routing/navigator';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import { ConfirmStore } from '~/stores/confirmStore';
import { LoginStore } from '~/stores/loginStore';
import * as s from './sidebarHeader.scss';

interface ISidebarHeaderProps {
    children: ReactNode;
    isCloseButtonVisible?: boolean;
    isBackButtonVisible?: boolean;
    isEditButtonVisible?: boolean;
    loginStore?: LoginStore;
    confirmStore?: ConfirmStore;
    isEditing?: boolean;
    shouldShowClosePromptMessage?: boolean;
    shouldShowEditButtonClosePromptMessage?: boolean;
    onEditButtonClick?: () => void;
    onBackButtonClick?: () => void;
    onCloseButtonClick?: () => void;
}

const closePromptMessage =
    'Sinulla on tallentamattomia muutoksia. Oletko varma, että haluat poistua näkymästä? Tallentamattomat muutokset kumotaan.';
const revertPromptMessage =
    'Sinulla on tallentamattomia muutoksia. Oletko varma, että haluat lopettaa muokkaamisen? Tallentamattomat muutokset kumotaan.';

@inject('loginStore', 'confirmStore')
@observer
class SidebarHeader extends React.Component<ISidebarHeaderProps> {
    private onBackButtonClick = () => {
        this.optionalConfirmPrompt({
            message: closePromptMessage,
            defaultOnClick: () => navigator.goBack(),
            customOnClick: this.props.onBackButtonClick,
            shouldShowMessage: this.props.shouldShowClosePromptMessage
        });
    };

    private onEditButtonClick = () => {
        this.optionalConfirmPrompt({
            message: revertPromptMessage,
            customOnClick: () => this.props.onEditButtonClick!(),
            shouldShowMessage: this.props.isEditing && this.props.shouldShowClosePromptMessage
        });
    };

    private onCloseButtonClick = () => {
        const homeViewLink = routeBuilder.to(SubSites.home).toLink();
        this.optionalConfirmPrompt({
            message: closePromptMessage,
            defaultOnClick: () => navigator.goTo({ link: homeViewLink }),
            customOnClick: this.props.onCloseButtonClick,
            shouldShowMessage: this.props.shouldShowClosePromptMessage
        });
    };

    private optionalConfirmPrompt = ({
        customOnClick,
        defaultOnClick,
        message,
        shouldShowMessage
    }: {
        message: string;
        defaultOnClick?: () => void;
        customOnClick?: () => void;
        shouldShowMessage?: boolean;
    }) => {
        const _onClick = customOnClick
            ? () => customOnClick!()
            : defaultOnClick
            ? () => defaultOnClick()
            : null;
        if (shouldShowMessage) {
            this.props.confirmStore!.openConfirm({
                content: message,
                onConfirm: _onClick!,
                confirmButtonText: 'Kyllä'
            });
        } else {
            if (_onClick) {
                _onClick();
            }
        }
    };

    render() {
        return (
            <div className={s.sidebarHeaderView}>
                <div className={s.topic}>{this.props.children}</div>
                <div className={s.buttonContainer}>
                    {this.props.isEditButtonVisible && this.props.loginStore!.hasWriteAccess && (
                        <FiEdit3
                            onClick={this.onEditButtonClick}
                            className={classnames(s.icon, this.props.isEditing && s.active)}
                        />
                    )}
                    {!this.props.isBackButtonVisible && (
                        <FiArrowLeft className={s.icon} onClick={this.onBackButtonClick} />
                    )}
                    {!this.props.isCloseButtonVisible && (
                        <FiXCircle className={s.icon} onClick={this.onCloseButtonClick} />
                    )}
                </div>
            </div>
        );
    }
}

export default SidebarHeader;
