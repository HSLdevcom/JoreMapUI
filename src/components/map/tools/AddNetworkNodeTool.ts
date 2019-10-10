import ToolbarTool from '~/enums/toolbarTool';
import navigator from '~/routing/navigator';
import RouteBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import MapStore from '~/stores/mapStore';
import NetworkStore, { MapLayer } from '~/stores/networkStore';
import ToolbarStore from '~/stores/toolbarStore';
import EventManager from '~/util/EventManager';
import { roundLatLng } from '~/util/geomHelper';
import BaseTool from './BaseTool';

class AddNetworkNodeTool implements BaseTool {
    public toolType = ToolbarTool.AddNetworkNode;
    public toolHelpHeader = 'Luo uusi solmu';
    public toolHelpText = 'Aloita uuden solmun luonti valitsemalla solmulle sijainti kartalta.';

    public activate() {
        NetworkStore.showMapLayer(MapLayer.node);
        NetworkStore.showMapLayer(MapLayer.link);
        EventManager.on('mapClick', this.onMapClick);
        MapStore.setMapCursor('crosshair');
    }

    public deactivate() {
        EventManager.off('mapClick', this.onMapClick);
        MapStore.setMapCursor('');
    }

    private onMapClick = async (clickEvent: CustomEvent) => {
        ToolbarStore.selectTool(null);
        const coordinate = roundLatLng(clickEvent.detail.latlng);
        const url = RouteBuilder.to(SubSites.newNode)
            .clear()
            .toTarget(':id', `${coordinate.lat}:${coordinate.lng}`)
            .toLink();
        navigator.goTo(url);
    };
}

export default AddNetworkNodeTool;
