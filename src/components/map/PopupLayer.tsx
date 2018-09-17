import React, { Component } from 'react';
import * as L from 'leaflet';
import { inject, observer } from 'mobx-react';
import { Popup } from 'react-leaflet';
import { PopupStore } from '../../stores/popupStore';
import { INode } from '../../models';
import { SidebarStore } from '../../stores/sidebarStore';
import * as s from './popupLayer.scss';
import routeBuilder  from '../../routing/routeBuilder';
import subSites from '../../routing/subSites';
import navigator from '../../routing/navigator';

interface PopupLayerProps {
    popupStore?: PopupStore;
    sidebarStore?: SidebarStore;
    setView: Function;
}

@inject('popupStore')
@inject('sidebarStore')
@observer
export default class PopupLayer extends Component<PopupLayerProps> {
    private onClose = () => {
        this.props.popupStore!.closePopup();
    }

    render() {
        if (this.props.popupStore!.popupNode) {
            const node = this.props.popupStore!.popupNode as INode;

            const openNode = () => {
                this.props.sidebarStore!.setOpenNodeId(node.id);
                const latLng = L.latLng(node.coordinates.lat, node.coordinates.lon);
                this.props.setView(latLng, 17);
                this.onClose();
                const nodeLink = routeBuilder.to(subSites.node).toLink();
                navigator.goTo(nodeLink);
            };

            return (
                <Popup
                    position={[node.coordinates.lat, node.coordinates.lon]}
                    className={s.leafletPopup}
                    closeButton={false}
                    onClose={this.onClose}
                >
                    <div className={s.popupContainer}>
                        <div onClick={openNode}>Avaa kohde</div>
                        <div>Tulosta</div>
                        <div>Poista linkki</div>
                        <div>Lisää linkki</div>
                        <div>Kopioi toiseen suuntaan</div>
                    </div>
                </Popup>
            );
        } return null;
    }
}
