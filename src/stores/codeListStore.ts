import { action, observable } from 'mobx';
import { IDropdownItem } from '~/components/controls/Dropdown';
import ICodeListItem from '~/models/ICodeListItem';

type codeListName =
    | 'Joukkoliikennelaji'
    | 'Tilaajaorganisaatio'
    | 'Verkko'
    | 'Joukkoliikennekohde'
    | 'LinjanKorvaavaTyyppi'
    | 'Kyllä/Ei'
    | 'Solmutyyppi (P/E)'
    | 'Kunta (KELA)'
    | 'Lyhyttunnus'
    | 'Suunta'
    | 'Ajantasaus pysakki'
    | 'Pysäkin käyttö'
    | 'Pysäkkialueid'
    | 'Pysäkkityyppi';

class CodeListStore {
    @observable private _codeListMap: Map<codeListName, ICodeListItem[]>;

    // Constructor
    @action
    public initialize = () => {
        this._codeListMap = new Map();
    };

    @action
    public setCodeListItems(codeListItems: ICodeListItem[]) {
        if (this._codeListMap.size > 0) return;

        codeListItems.forEach((codeListItem: ICodeListItem) => {
            const codeListName = codeListItem.listId as codeListName;
            let codeListItems = this._codeListMap.get(codeListName);
            if (!codeListItems) {
                codeListItems = [];
            }
            codeListItems.push(codeListItem);
            this._codeListMap.set(codeListName, codeListItems);
        });
        this._codeListMap.forEach((codeListItems: ICodeListItem[], key: string) => {
            const sortedCodeListItems = codeListItems
                .slice()
                .sort((a, b) => a.orderNumber - b.orderNumber);
            this._codeListMap.set(key as codeListName, sortedCodeListItems);
        });
    }

    public getDropdownItemList = (codeListName: codeListName): IDropdownItem[] => {
        const codeListItems = this._codeListMap.get(codeListName);

        if (codeListItems) {
            return codeListItems.map((codeListItem: ICodeListItem) => {
                return {
                    value: codeListItem.value,
                    label: codeListItem.label,
                };
            });
        }
        throw `getDropdownItemList() - Unsupported codeListName: ${codeListName}`;
    };

    // TODO: rename as getCodeListValueLabel?
    public getCodeListLabel = (codeListName: codeListName, value: string) => {
        const codeListItems = this._codeListMap.get(codeListName);
        if (codeListItems) {
            const item = codeListItems.find(
                (item) => item.listId === codeListName && item.value === value
            );
            return item ? item.label : '';
        }
        throw `getCodeListLabel() - Unsupported codeListName: ${codeListName}`;
    };
}

export default new CodeListStore();

export { CodeListStore, codeListName };
