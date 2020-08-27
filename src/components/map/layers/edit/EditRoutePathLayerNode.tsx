import { inject, observer } from 'mobx-react';
import React, { Component } from 'react';
import ToolbarToolType from '~/enums/toolbarToolType';
import EventListener, { IRoutePathNodeClickParams } from '~/helpers/EventListener';
import INode from '~/models/INode';
import { MapStore } from '~/stores/mapStore';
import { RoutePathCopySegmentStore } from '~/stores/routePathCopySegmentStore';
import { RoutePathLayerStore } from '~/stores/routePathLayerStore';
import { RoutePathStore } from '~/stores/routePathStore';
import { ToolbarStore } from '~/stores/toolbarStore';
import NodeUtils from '~/utils/NodeUtils';
import Marker from '../markers/Marker';
import NodeMarker from '../markers/NodeMarker';

const START_MARKER_COLOR = '#00df0b';

interface IRoutePathLayerNodeProps {
    node: INode;
    isDisabled: boolean;
    linkOrderNumber: number;
    routePathStore?: RoutePathStore;
    routePathLayerStore?: RoutePathLayerStore;
    routePathCopySegmentStore?: RoutePathCopySegmentStore;
    toolbarStore?: ToolbarStore;
    mapStore?: MapStore;
}

@inject(
    'routePathStore',
    'routePathLayerStore',
    'toolbarStore',
    'mapStore',
    'routePathCopySegmentStore'
)
@observer
class EditRoutePathLayerNode extends Component<IRoutePathLayerNodeProps> {
    private renderNode = ({ node, isDisabled }: { node: INode; isDisabled: boolean }) => {
        const routePathLayerStore = this.props.routePathLayerStore;
        let isNodeHighlighted;
        if (routePathLayerStore!.hoveredItemId) {
            isNodeHighlighted = routePathLayerStore!.hoveredItemId === node.internalId;
        } else {
            isNodeHighlighted = routePathLayerStore!.extendedListItemId === node.internalId;
        }

        const isHighlightedByTool = this.props.routePathLayerStore!.toolHighlightedNodeIds.includes(
            node.internalId
        );
        const isExtended = this.props.routePathLayerStore!.extendedListItemId === node.internalId;
        const isHovered = this.props.routePathLayerStore!.hoveredItemId === node.internalId;
        const isHighlighted = isHighlightedByTool || isExtended || isHovered;
        const highlightColor = isHovered
            ? 'yellow'
            : isHighlightedByTool
            ? 'green'
            : isExtended
            ? 'blue'
            : undefined;
        return (
            <NodeMarker
                coordinates={node.coordinates}
                nodeType={node.type}
                transitTypes={node.transitTypes ? node.transitTypes : []}
                nodeLocationType={'coordinates'}
                nodeId={node.id}
                shortId={NodeUtils.getShortId(node)}
                hastusId={node.stop ? node.stop.hastusId : undefined}
                isHighlighted={isHighlighted}
                highlightColor={highlightColor}
                isDisabled={isDisabled}
                onClick={this.onNodeClick}
                onMouseOver={this.onMouseEnterNode}
                onMouseOut={this.onMouseLeaveNode}
            />
        );
    };

    private onNodeClick = () => {
        const { node, linkOrderNumber } = this.props;
        const clickParams: IRoutePathNodeClickParams = {
            node,
            linkOrderNumber,
        };
        EventListener.trigger('routePathNodeClick', clickParams);
    };

    private onMouseEnterNode = () => {
        this.props.routePathLayerStore!.setHoveredItemId(this.props.node.internalId);
    };

    private onMouseLeaveNode = () => {
        if (this.props.routePathLayerStore!.hoveredItemId === this.props.node.internalId) {
            this.props.routePathLayerStore!.setHoveredItemId(null);
        }
    };

    private renderStartMarker = () => {
        if (this.props.toolbarStore!.isSelected(ToolbarToolType.ExtendRoutePath)) {
            // Hiding start marker if we set target node adding new links.
            // Due to the UI otherwise getting messy
            return null;
        }

        const routePathLinks = this.props.routePathStore!.routePath!.routePathLinks;
        if (!routePathLinks || routePathLinks.length === 0 || !routePathLinks[0].startNode) {
            return null;
        }

        return (
            <Marker
                latLng={routePathLinks[0].startNode.coordinates}
                color={START_MARKER_COLOR}
                isClickDisabled={true}
            />
        );
    };

    render() {
        const { node, isDisabled } = this.props;
        return (
            <>
                {this.renderNode({
                    node,
                    isDisabled,
                })}
                {this.renderStartMarker()}
            </>
        );
    }
}

export default EditRoutePathLayerNode;
