import { inject, observer } from 'mobx-react';
import React, { Component } from 'react';
import navigator from '~/routing/navigator';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import { MapStore } from '~/stores/mapStore';
import * as s from './pageNotFoundView.scss';

interface IPageNotFoundViewProps {
    mapStore?: MapStore;
}

@inject('mapStore')
@observer
class PageNotFoundView extends Component<IPageNotFoundViewProps> {
    componentDidMount() {
        this.props.mapStore!.initCoordinates();
    }
    private goToHomeView = () => {
        const homeViewLink = routeBuilder.to(SubSites.home).toLink();
        navigator.goTo({ link: homeViewLink });
    };

    render() {
        return (
            <div className={s.pageNotFoundView}>
                <div className={s.content}>
                    Sivua ei löytynyt. Siirry{' '}
                    <span className={s.link} onClick={this.goToHomeView}>
                        kotisivulle
                    </span>
                    .
                </div>
            </div>
        );
    }
}

export default PageNotFoundView;
