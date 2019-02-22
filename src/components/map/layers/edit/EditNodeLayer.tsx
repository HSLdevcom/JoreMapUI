import React, { Component } from 'react';
import * as L from 'leaflet';
import _ from 'lodash';
import { withLeaflet } from 'react-leaflet';
import { matchPath } from 'react-router';
import { inject, observer } from 'mobx-react';
import { IReactionDisposer, reaction } from 'mobx';
import navigator from '~/routing/navigator';
import SubSites from '~/routing/subSites';
import { ILink } from '~/models';
import NodeLocationType from '~/types/NodeLocationType';
import { NodeStore } from '~/stores/nodeStore';
import NodeMarker from '../mapIcons/NodeMarker';
import { LeafletContext } from '../../Map';
import ArrowDecorator from '../ArrowDecorator';

interface IEditNodeLayerProps {
    nodeStore?: NodeStore;
    leaflet: LeafletContext;
}

@inject('nodeStore')
@observer
class EditNodeLayer extends Component<IEditNodeLayerProps> {
    private reactionDisposer: IReactionDisposer;
    private editableLinks: L.Polyline[] = [];

    componentDidMount() {
        this.reactionDisposer = reaction(
            () => this.props.nodeStore!.node,
            () => this.props.nodeStore!.node === null && this.removeOldLinks(),
        );
    }

    componentWillUnmount() {
        this.reactionDisposer();

        const map = this.props.leaflet.map;
        map!.off('editable:vertex:dragend');
        map!.off('editable:vertex:deleted');
    }

    private removeOldLinks = () => {
        // Remove (possible) previously drawn links from map
        this.editableLinks.forEach((editableLink: any) => {
            editableLink.remove();
        });
        this.editableLinks = [];
    }

    private renderNode() {
        const node = this.props.nodeStore!.node;
        if (!node) return null;

        return (
            <NodeMarker
                key={node.id}
                isDraggable={true}
                node={node}
                onMoveMarker={this.onMoveMarker()}
            />
        );
    }

    private onMoveMarker = () =>
        (coordinatesType: NodeLocationType, coordinates: L.LatLng) => {
            this.props.nodeStore!.updateNode(coordinatesType, coordinates);
        }

    private drawEditableLinks = () => {
        this.removeOldLinks();

        this.props.nodeStore!.links.forEach(
            link => this.drawEditableLink(link));

        const map = this.props.leaflet.map;

        map!.on('editable:vertex:dragend', (data: any) => {
            this.refreshEditableLink(data.layer._leaflet_id);
        });
        map!.on('editable:vertex:deleted', (data: any) => {
            this.refreshEditableLink(data.layer._leaflet_id);
        });
    }

    private refreshEditableLink(leafletId: number) {
        const editableLink =
            this.editableLinks.find((link: any) => link._leaflet_id === leafletId);
        if (editableLink) {
            const latlngs = editableLink!.getLatLngs()[0] as L.LatLng[];
            const editableLinkIndex =
                this.editableLinks.findIndex((link: any) => link._leaflet_id === leafletId);
            this.props.nodeStore!.changeLinkGeometry(latlngs, editableLinkIndex);
        }
    }

    private drawEditableLink = (link: ILink) => {
        const isNodeView = Boolean(matchPath(navigator.getPathName(), SubSites.node));
        if (!isNodeView || !link) return;

        this.drawEditableLinkToMap(link);
    }

    private drawEditableLinkToMap = (link: ILink) => {
        const map = this.props.leaflet.map;
        if (map) {
            const editableLink = L.polyline(
                [_.cloneDeep(link.geometry)],
                { interactive: false },
            ).addTo(map);
            editableLink.enableEdit();
            const latLngs = editableLink.getLatLngs() as L.LatLng[][];
            const coords = latLngs[0];
            const coordsToDisable = [coords[0], coords[coords.length - 1]];
            coordsToDisable.forEach((coordToDisable: any) => {
                const vertexMarker = coordToDisable.__vertex;
                vertexMarker.dragging.disable();
                vertexMarker._events.click = {};
                vertexMarker.setOpacity(0);
                // Put vertex marker z-index low so that it
                // would be below other layers that needs to be clickable
                vertexMarker.setZIndexOffset(-1000);
            });
            this.editableLinks.push(editableLink);
        }
    }

    private renderLinkDecorators = () => {
        return this.props.nodeStore!.links.map(
            (link, index) => (
                <ArrowDecorator
                    key={index}
                    color='#4f93f8'
                    geometry={link!.geometry}
                    hideOnEventName='editable:vertex:drag'
                    showOnEventName='editable:vertex:dragend'
                />
            ));
    }

    render() {
        const isNodeViewVisible = Boolean(matchPath(navigator.getPathName(), SubSites.node));
        if (!isNodeViewVisible) return null;

        this.drawEditableLinks();
        return (
            <>
                {this.renderNode()}
                {this.renderLinkDecorators()}
            </>
        );
    }
}

export default withLeaflet(EditNodeLayer);
