import React, { Component } from 'react';
import * as L from 'leaflet';
import { Polyline, FeatureGroup } from 'react-leaflet';
import { observer, inject } from 'mobx-react';
import { IRoutePathLink } from '~/models';
import NodeType from '~/enums/nodeType';
import { PopupStore } from '~/stores/popupStore';
import NodeLayer from './NodeLayer';
import StartMarker from './objects/StartMarker';

interface RoutePathLinkLayerProps {
    popupStore?: PopupStore;
    internalId: string;
    routePathLinks: IRoutePathLink[];
    onClick: Function;
    onContextMenu: Function;
    onMouseOver: Function;
    onMouseOut: Function;
    color: string;
    opacity: number;
    weight: number;
}

@inject('popupStore')
@observer
class RoutePathLinkLayer extends Component<RoutePathLinkLayerProps> {

    private onContextMenu = (routePathLinkId: string) => () => {
        this.props.onContextMenu(routePathLinkId);
    }

    private renderRoutePathLinks() {
        const routePathLinks = this.props.routePathLinks;
        return routePathLinks.map((routePathLink, index) => {
            return (
                <Polyline
                    positions={routePathLink.positions}
                    key={routePathLink.id}
                    color={this.props.color}
                    weight={this.props.weight}
                    opacity={this.props.opacity}
                    onClick={this.props.onClick}
                    onContextMenu={this.onContextMenu(routePathLink.id)}
                />
            );
        });
    }

    private renderNodes() {
        const routePathLinks = this.props.routePathLinks;
        const nodes = routePathLinks
            .map((routePathLink, index) => {
                return (
                    <NodeLayer
                        key={`${routePathLink.startNode.id}-${index}`}
                        node={routePathLink.startNode}
                        isDisabled={routePathLink.startNodeType === NodeType.DISABLED}
                        isTimeAlignmentStop={routePathLink.isStartNodeTimeAlignmentStop}
                    />
                );
            });
        nodes.push(
            <NodeLayer
                key={`${routePathLinks[routePathLinks.length - 1]
                    .endNode.id}-${routePathLinks.length}`}
                node={routePathLinks[routePathLinks.length - 1].endNode}
                isDisabled={false} // Last node can't be disabled
                isTimeAlignmentStop={false} // Last node can't be a time alignment stop
            />);
        return nodes;
    }

    private renderStartMarker() {
        const color = this.props.color;
        const routePathLinks = this.props.routePathLinks;
        if (routePathLinks!.length === 0) return;
        const coordinates = routePathLinks![0].startNode.coordinates;
        const latLng = L.latLng(coordinates.lat, coordinates.lon);
        return (
            <StartMarker
                latLng={latLng}
                color={color}
            />
        );
    }

    render() {
        return (
            <FeatureGroup
                routePathInternalId={this.props.internalId}
                onMouseOver={this.props.onMouseOver}
                onMouseOut={this.props.onMouseOut}
            >
                {this.renderRoutePathLinks()}
                {this.renderNodes()}
                {this.renderStartMarker()}
            </FeatureGroup>
        );
    }
}

export default RoutePathLinkLayer;
