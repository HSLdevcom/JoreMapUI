import React, { Component } from 'react';
import { Marker } from 'react-leaflet';
import * as L from 'leaflet';
import { observer } from 'mobx-react';
import ColorScale from '../../util/colorScale';
import PinIcon from '../../icons/pin';
import * as s from './markerLayer.scss';

// The logic of Z Indexes is not very logical.
// Setting z-index to 2, if other items is 1 wont force it to be on top.
// Setting z-index to a very high number will however most likely set the item on top.
// https://leafletjs.com/reference-1.3.4.html#marker-zindexoffset
const VERY_HIGH_Z_INDEX = 1000;

interface MarkerLayerProps {
    coordinates: number[];
}

@observer
export default class MarkerLayer extends Component<MarkerLayerProps> {
    private getStartPointIcon = (color: string) => {
        const divIconOptions : L.DivIconOptions = {
            className: s.nodeMarker,
            html: PinIcon.getPin(color),
        };

        return new L.DivIcon(divIconOptions);
    }

    render() {
        const colors = ColorScale.getColors(this.props.coordinates.length);
        return this.props.coordinates.map((_coordinates, index) => {
            const icon = this.getStartPointIcon(colors[index]);
            return (
                <Marker
                    zIndexOffset={VERY_HIGH_Z_INDEX}
                    icon={icon}
                    key={index}
                    position={[_coordinates[1], _coordinates[0]]}
                />
            );
        });
    }
}
