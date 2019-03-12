import React, { Component } from 'react';
import { IoMdContact } from 'react-icons/io';
import hslLogo from '~/assets/hsl-logo.png';
import routeBuilder from '~/routing/routeBuilder';
import { observer, inject } from 'mobx-react';
import ApiClient from '~/util/ApiClient';
import endpoints from '~/enums/endpoints';
import { LoginStore } from '~/stores/loginStore';
import SubSites from '~/routing/subSites';
import navigator from '~/routing/navigator';
import ButtonType from '~/enums/buttonType';
import { Button } from './controls/index';
import packageVersion from '../project/version.json';
import * as s from './navigationBar.scss';

interface INavigationBarProps {
    loginStore?: LoginStore;
}

@inject('loginStore')
@observer
class NavigationBar extends Component<INavigationBarProps> {
    private goToHomeView = () => {
        const homeLink = routeBuilder.to(SubSites.home).clear().toLink();
        navigator.goTo(homeLink);
    }

    private logout = async () => {
        // TODO: Implement full logout clearing session in backend
        // https://github.com/HSLdevcom/jore-map-ui/issues/669
        await ApiClient.postRequest(endpoints.LOGOUT, {});
        this.props.loginStore!.clear();
        const loginLink = routeBuilder.to(SubSites.login).clear().toLink();
        navigator.goTo(loginLink);
    }

    render () {
        const buildDate = process.env.BUILD_DATE;
        const buildDateInfo = buildDate ? `Date: ${buildDate}` : '';

        return (
            <div className={s.navigationBarView}>
                <div className={s.buildInfo}>
                    {`Build: ${packageVersion.version} ${buildDateInfo}`}
                </div>
                <div onClick={this.goToHomeView} className={s.header}>
                    <img className={s.logo} src={hslLogo} alt='HSL Logo'/>
                    <div className={s.title}>
                        Joukkoliikennerekisteri
                    </div>
                </div>
                <div className={s.authSection}>
                    <div className={s.authInfo}>
                        <IoMdContact />
                        <div>
                            {this.props.loginStore!.userEmail}
                            <br/>
                            { this.props.loginStore!.hasWriteAccess ?
                                'Pääkäyttäjä' : 'Selauskäyttäjä'
                            }
                        </div>
                    </div>
                    <Button
                        className={s.logoutButton}
                        type={ButtonType.SAVE}
                        onClick={this.logout}
                    >Kirjaudu ulos
                    </Button>
                </div>
            </div>
        );
    }
}

export default NavigationBar;
