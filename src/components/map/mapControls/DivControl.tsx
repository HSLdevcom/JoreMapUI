import { Control, DomEvent, DomUtil } from 'leaflet';

const divControl: any = Control.extend({
    options: {},
    onAdd: () => {
        const container = DomUtil.create('div');
        DomEvent.disableClickPropagation(container);
        DomEvent.disableScrollPropagation(container);
        return container;
    }
});

export default divControl;
