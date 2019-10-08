import React, { Component } from 'react';
import { Marker as LeafletMarker, Circle } from 'react-leaflet';
import * as L from 'leaflet';
import _ from 'lodash';
import { observer, inject } from 'mobx-react';
import classnames from 'classnames';
import { INode } from '~/models/index';
import NodeLocationType from '~/types/NodeLocationType';
import NodeType from '~/enums/nodeType';
import { MapStore, NodeLabel } from '~/stores/mapStore';
import NodeHelper from '~/util/nodeHelper';
import LeafletUtils from '~/util/leafletUtils';
import MarkerPopup from './MarkerPopup';
import * as s from './nodeMarker.scss';

enum NodeHighlightColor {
    BLUE, // default color
    GREEN
}

interface INodeMarkerProps {
    mapStore?: MapStore;
    isSelected: boolean;
    color?: string;
    onContextMenu?: Function;
    onClick?: Function;
    isDraggable?: boolean;
    highlight?: { isHighlighted: boolean; color?: NodeHighlightColor };
    forcedVisibleNodeLabels?: NodeLabel[];
    markerClasses?: string[];
    // static markup language (HTML)
    popupContent?: string;
    node: INode;
    isClickDisabled?: boolean;
    isDisabled?: boolean;
    isTimeAlignmentStop?: boolean;
    onMoveMarker?: (
        coordinatesType: NodeLocationType,
        coordinates: L.LatLng
    ) => void;
}

const NODE_LABEL_MIN_ZOOM = 14;

@inject('mapStore')
@observer
class NodeMarker extends Component<INodeMarkerProps> {
    static defaultProps = {
        isDraggable: false,
        highlight: { isHighlighted: false },
        forcedVisibleNodeLabels: [],
        markerClasses: []
    };

    markerRef: any;

    constructor(props: INodeMarkerProps) {
        super(props);
        this.markerRef = React.createRef<LeafletMarker>();
    }

    componentDidMount() {
        if (this.props.popupContent) {
            MarkerPopup.initPopup(this.props.popupContent, this.markerRef);
        }
    }

    private onMoveMarker = (coordinatesType: NodeLocationType) => (
        e: L.DragEndEvent
    ) => {
        if (this.props.onMoveMarker) {
            this.props.onMoveMarker(coordinatesType, e.target.getLatLng());
        }
    };

    private getLabels(): string[] {
        const node = this.props.node;
        const zoom = this.props.mapStore!.zoom;

        const visibleNodeLabels = _.union(
            this.props.mapStore!.visibleNodeLabels,
            this.props.forcedVisibleNodeLabels
        );

        if (visibleNodeLabels.length === 0 || zoom < NODE_LABEL_MIN_ZOOM) {
            return [];
        }

        const labels: string[] = [];
        if (visibleNodeLabels.includes(NodeLabel.hastusId)) {
            if (node.stop && node.stop.hastusId) {
                labels.push(node.stop.hastusId);
            }
        }
        if (visibleNodeLabels.includes(NodeLabel.longNodeId)) {
            labels.push(node.id);
        }
        const nodeShortId = NodeHelper.getShortId(node);
        if (nodeShortId && visibleNodeLabels.includes(NodeLabel.shortNodeId)) {
            labels.push(nodeShortId);
        }

        return labels;
    }

    private getMarkerClasses = () => {
        const isSelected = this.props.isSelected;
        const res = [...this.props.markerClasses!];
        res.push(s.nodeBase);
        res.push(
            NodeHelper.getNodeTypeClass(this.props.node.type, {
                isNodeDisabled: this.props.isDisabled,
                isNodeTimeAlignment: this.props.isTimeAlignmentStop,
                isNodeHighlighted: isSelected
            })
        );
        const highlight = this.props.highlight;
        if (highlight && highlight.isHighlighted) {
            switch (highlight.color) {
                case NodeHighlightColor.BLUE: {
                    res.push(s.highlightBlue);
                    break;
                }
                case NodeHighlightColor.GREEN: {
                    res.push(s.highlightGreen);
                    break;
                }
                default: {
                    res.push(s.highlightBlue);
                }
            }
        }
        return res;
    };

    private renderMarkerLabel = () => {
        const labels = this.getLabels();
        if (!labels) return null;
        return (
            <div className={s.nodeLabel}>
                {labels.map((label, index) => {
                    return <div key={index}>{label}</div>;
                })}
            </div>
        );
    };

    private renderStopRadiusCircle = () => {
        const nodeType = this.props.node.type;

        if (
            !this.props.isSelected ||
            nodeType !== NodeType.STOP ||
            !this.props.node.stop ||
            !this.props.node.stop!.radius
        ) {
            return null;
        }

        return (
            <Circle
                className={s.stopCircle}
                center={this.props.node.coordinates}
                radius={this.props.node.stop!.radius}
            />
        );
    };

    private renderAdditionalLocations = (node: INode) => {
        const nodeBaseClass = this.props.isClickDisabled
            ? s.nodeNotClickable
            : s.node;

        return (
            <>
                <LeafletMarker
                    position={node.coordinatesManual}
                    icon={LeafletUtils.createDivIcon(
                        <div
                            className={classnames(
                                s.manual,
                                ...this.getMarkerClasses()
                            )}
                        />,
                        { className: nodeBaseClass }
                    )}
                    draggable={this.isDraggable()}
                    onDragEnd={
                        this.props.onMoveMarker &&
                        this.onMoveMarker('coordinatesManual')
                    }
                    interactive={!this.props.isClickDisabled}
                />
                <LeafletMarker
                    position={node.coordinatesProjection}
                    icon={LeafletUtils.createDivIcon(
                        <div
                            className={classnames(
                                s.projection,
                                ...this.getMarkerClasses()
                            )}
                        />,
                        { className: nodeBaseClass }
                    )}
                    draggable={this.isDraggable()}
                    onDragEnd={
                        this.props.onMoveMarker &&
                        this.onMoveMarker('coordinatesProjection')
                    }
                    interactive={!this.props.isClickDisabled}
                />
            </>
        );
    };

    private isDraggable = () =>
        // TODO this should probably check other stuff too...
        this.props.isSelected && this.props.isDraggable;

    private onMarkerClick = () => {
        if (this.props.onClick) {
            this.props.onClick();
        }
    };

    render() {
        const nodeBaseClass = this.props.isClickDisabled
            ? s.nodeNotClickable
            : s.node;

        const icon = LeafletUtils.createDivIcon(
            <div
                className={classnames(...this.getMarkerClasses())}
                style={{
                    borderColor: this.props.color,
                    backgroundColor: this.props.color
                }}
            >
                {this.props.children}
                {this.renderMarkerLabel()}
            </div>,
            {
                className: nodeBaseClass,
                popupOffset: -15
            }
        );

        return (
            <>
                <LeafletMarker
                    ref={this.markerRef}
                    onContextMenu={this.props.onContextMenu}
                    onClick={this.onMarkerClick}
                    draggable={this.props.isDraggable}
                    icon={icon}
                    position={this.props.node.coordinates}
                    onDragEnd={
                        this.props.onMoveMarker &&
                        this.onMoveMarker('coordinates')
                    }
                    interactive={!this.props.isClickDisabled}
                >
                    {this.renderStopRadiusCircle()}
                </LeafletMarker>
                {this.props.isSelected &&
                    this.props.node.type === NodeType.STOP &&
                    this.renderAdditionalLocations(this.props.node!)}
            </>
        );
    }
}

export default NodeMarker;

export { NodeHighlightColor };
