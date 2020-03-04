import IExternalStop from './IExternalStop';

export default interface IExternalNode {
    soltunnus: string;
    soltyyppi: string;
    sollistunnus: string;
    solkuka?: string;
    solviimpvm?: Date;
    solkirjain?: string;
    solhis?: string;
    solotapa?: string;
    mittpvm?: Date;
    pysakkiBySoltunnus?: IExternalStop;
    transitTypes: string;
    geojson?: string;
    geojsonManual: string;
    geojsonProjection: string;
    dateRanges?: string;
}
