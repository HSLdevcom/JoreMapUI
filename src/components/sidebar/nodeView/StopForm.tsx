import classnames from 'classnames';
import { reaction, IReactionDisposer } from 'mobx';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { Button, Dropdown, TransitToggleButtonBar } from '~/components/controls';
import { IDropdownItem } from '~/components/controls/Dropdown';
import InputContainer from '~/components/controls/InputContainer';
import TextContainer from '~/components/controls/TextContainer';
import ViewFormBase from '~/components/shared/inheritedComponents/ViewFormBase';
import ButtonType from '~/enums/buttonType';
import TransitType from '~/enums/transitType';
import { INode, IStop } from '~/models';
import stopValidationModel from '~/models/validationModels/stopValidationModel';
import navigator from '~/routing/navigator';
import RouteBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import NodeService from '~/services/nodeService';
import StopAreaService, { IStopAreaItem } from '~/services/stopAreaService';
import StopService, { IStopSectionItem } from '~/services/stopService';
import { CodeListStore } from '~/stores/codeListStore';
import { NodeStore } from '~/stores/nodeStore';
import SidebarHeader from '../SidebarHeader';
import ShortIdInput from './ShortIdInput';
import * as s from './stopForm.scss';

interface IStopFormProps {
    node: INode;
    isNewStop: boolean;
    isEditingDisabled: boolean;
    nodeStore?: NodeStore;
    codeListStore?: CodeListStore;
    nodeInvalidPropertiesMap: object;
    onNodePropertyChange: (property: keyof INode) => (value: any) => void;
}

interface IStopFormState {
    isLoading: boolean; // not currently in use, declared because ViewFormBase needs this
    invalidPropertiesMap: object;
    isEditingDisabled: boolean;
    stopAreas: IDropdownItem[];
    stopSections: IDropdownItem[];
}

@inject('nodeStore', 'codeListStore')
@observer
class StopForm extends ViewFormBase<IStopFormProps, IStopFormState> {
    private isEditingDisabledListener: IReactionDisposer;
    private nodeListener: IReactionDisposer;
    private stopPropertyListeners: IReactionDisposer[];
    private mounted: boolean;

    constructor(props: IStopFormProps) {
        super(props);
        this.state = {
            isLoading: false,
            invalidPropertiesMap: {},
            isEditingDisabled: false,
            stopAreas: [],
            stopSections: []
        };
        this.stopPropertyListeners = [];
    }

    async componentDidMount() {
        this.mounted = true;
        this.validateStop();
        this.isEditingDisabledListener = reaction(
            () => this.props.nodeStore!.isEditingDisabled,
            this.onChangeIsEditingDisabled
        );
        this.nodeListener = reaction(() => this.props.nodeStore!.node, this.onNodeChange);
        this.createStopPropertyListeners();
        if (this.props.isNewStop) {
            this.props.nodeStore!.fetchAddressData();
        }
        const stopAreas: IStopAreaItem[] = await StopAreaService.fetchAllStopAreas();
        const stopSections: IStopSectionItem[] = await StopService.fetchAllStopSections();
        if (this.mounted) {
            this.setState({
                stopAreas: this.createStopAreaDropdownItems(stopAreas),
                stopSections: this.createStopSectionDropdownItems(stopSections)
            });
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        this.isEditingDisabledListener();
        this.removeStopPropertyListeners();
        this.nodeListener();
    }

    private createStopPropertyListeners = () => {
        const nodeStore = this.props.nodeStore;
        if (!nodeStore!.node) return;

        const stop = nodeStore!.node.stop;
        for (const property in stop!) {
            if (Object.prototype.hasOwnProperty.call(stop, property)) {
                const listener = this.createListener(property);
                this.stopPropertyListeners.push(listener);
            }
        }
    };

    private createListener = (property: string) => {
        return reaction(
            () => this.props.nodeStore!.node && this.props.nodeStore!.node!.stop![property],
            this.validateStopProperty(property)
        );
    };

    private removeStopPropertyListeners = () => {
        this.stopPropertyListeners.forEach((listener: IReactionDisposer) => listener());
        this.stopPropertyListeners = [];
    };

    private onChangeIsEditingDisabled = () => {
        this.clearInvalidPropertiesMap();
        if (!this.props.nodeStore!.isEditingDisabled) this.validateStop();
    };

    private onNodeChange = async () => {
        this.validateStop();
        this.removeStopPropertyListeners();
        this.createStopPropertyListeners();
        if (
            !this.props.nodeStore!.node ||
            (!this.props.isNewStop && this.props.nodeStore!.isEditingDisabled)
        ) {
            return;
        }
        await this.props.nodeStore!.fetchAddressData();
    };

    private validateStopProperty = (property: string) => () => {
        const nodeStore = this.props.nodeStore;
        if (!nodeStore!.node) return;
        const value = nodeStore!.node!.stop![property];
        this.validateProperty(stopValidationModel[property], property, value);
        const isStopFormValid = this.isFormValid();
        nodeStore!.setIsStopFormValid(isStopFormValid);
    };

    private createStopAreaDropdownItems = (stopAreas: IStopAreaItem[]): IDropdownItem[] => {
        return stopAreas.map((stopArea: IStopAreaItem) => {
            const item: IDropdownItem = {
                value: `${stopArea.pysalueid}`,
                label: `${stopArea.pysalueid} - ${stopArea.nimi}`
            };
            return item;
        });
    };

    private createStopSectionDropdownItems = (
        stopSections: IStopSectionItem[]
    ): IDropdownItem[] => {
        return stopSections.map((stopSection: IStopSectionItem) => {
            const item: IDropdownItem = {
                value: `${stopSection.selite}`,
                label: `${stopSection.selite}`
            };
            return item;
        });
    };

    private validateStop = () => {
        const node = this.props.nodeStore!.node;
        if (!node) return;
        const stop = node.stop;
        this.validateAllProperties(stopValidationModel, stop);
        const isStopFormValid = this.isFormValid();
        this.props.nodeStore!.setIsStopFormValid(isStopFormValid);
    };

    private updateStopProperty = (property: keyof IStop) => (value: any) => {
        this.props.nodeStore!.updateStop(property, value);
    };

    private updateTransitType = (newValue: TransitType) => {
        const node = this.props.nodeStore!.node;
        const currentValue = node!.stop!.transitType;
        if (currentValue === newValue) {
            // Deselect current value
            this.updateStopProperty('transitType')(null);
        } else {
            this.updateStopProperty('transitType')(newValue);
            NodeService.getGeneratedNodeId(newValue, node.coordinates);
        }
    };

    private getShortIdLetterItems = () => {
        const shortIdLetterItems = this.props.codeListStore!.getDropdownItemList('Lyhyttunnus');
        shortIdLetterItems.forEach(item => (item.label = `${item.value} - ${item.label}`));
        return shortIdLetterItems;
    };

    private onShortIdLetterChange = (value: string) => {
        this.props.onNodePropertyChange('shortIdLetter')(value);
        if (!value) {
            this.props.onNodePropertyChange('shortIdString')(null);
        }
    };

    private redirectToNewStopArea = () => {
        const url = RouteBuilder.to(SubSites.newStopArea)
            .clear()
            .toLink();
        navigator.goTo(url);
    };

    render() {
        const isEditingDisabled = this.props.nodeStore!.isEditingDisabled;
        const node = this.props.node;
        const stop = node.stop!;
        const onChange = this.updateStopProperty;
        const invalidPropertiesMap = this.state.invalidPropertiesMap;
        return (
            <div className={classnames(s.stopView, s.form)}>
                <SidebarHeader hideCloseButton={true} hideBackButton={true}>
                    Pysäkin tiedot
                </SidebarHeader>
                <div className={s.formSection}>
                    {this.props.isNewStop && (
                        <>
                            <div className={s.flexRow}>
                                <div className={s.formItem}>
                                    <div className={s.inputLabel}>VERKKO</div>
                                    <TransitToggleButtonBar
                                        selectedTransitTypes={
                                            stop.transitType ? [stop.transitType] : []
                                        }
                                        toggleSelectedTransitType={this.updateTransitType}
                                    />
                                </div>
                            </div>
                            <div className={s.flexRow}>
                                <div className={s.formItem}>
                                    <InputContainer
                                        label='SOLMUN TUNNUS'
                                        disabled={isEditingDisabled}
                                        value={stop.nodeId}
                                        onChange={onChange('nodeId')}
                                        validationResult={invalidPropertiesMap['nodeId']}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    <div className={s.flexRow}>
                        <Dropdown
                            label='LYHYTTUNNUS (2 kirj.'
                            onChange={this.onShortIdLetterChange}
                            disabled={isEditingDisabled}
                            selected={node.shortIdLetter}
                            emptyItem={{
                                value: '',
                                label: ''
                            }}
                            items={this.getShortIdLetterItems()}
                        />
                        <ShortIdInput
                            node={node}
                            isBackgroundGrey={!isEditingDisabled && !Boolean(node.shortIdLetter)}
                            isEditingDisabled={isEditingDisabled || !Boolean(node.shortIdLetter)}
                            nodeInvalidPropertiesMap={this.props.nodeInvalidPropertiesMap}
                            onNodePropertyChange={this.props.onNodePropertyChange}
                        />
                    </div>
                </div>
                <div className={s.formSection}>
                    <div className={s.sectionHeader}>Nimitiedot</div>
                    <div className={s.flexRow}>
                        <InputContainer
                            label='NIMI'
                            disabled={isEditingDisabled}
                            value={stop.nameFi}
                            onChange={onChange('nameFi')}
                            validationResult={invalidPropertiesMap['nameFi']}
                        />
                        <InputContainer
                            label='NIMI RUOTSIKSI'
                            disabled={isEditingDisabled}
                            value={stop.nameSw}
                            onChange={onChange('nameSw')}
                            validationResult={invalidPropertiesMap['nameSw']}
                        />
                    </div>
                    <div className={s.flexRow}>
                        <InputContainer
                            label='PITKÄ NIMI'
                            disabled={isEditingDisabled}
                            value={stop.nameLongFi}
                            onChange={onChange('nameLongFi')}
                            validationResult={invalidPropertiesMap['nameLongFi']}
                        />
                        <InputContainer
                            label='PITKÄ NIMI RUOTSIKSI'
                            disabled={isEditingDisabled}
                            value={stop.nameLongSw}
                            onChange={onChange('nameLongSw')}
                            validationResult={invalidPropertiesMap['nameLongSw']}
                        />
                    </div>
                    <div className={s.flexRow}>
                        <TextContainer
                            label='PITKÄ NIMI MUOKATTU PVM'
                            value={stop.nameModifiedOn}
                            isTimeIncluded={true}
                        />
                    </div>
                </div>
                <div className={s.formSection}>
                    <div className={s.sectionHeader}>Osoitetiedot</div>
                    <div className={s.flexRow}>
                        <InputContainer
                            label='PAIKAN NIMI'
                            disabled={isEditingDisabled}
                            value={stop.placeNameFi}
                            onChange={onChange('placeNameFi')}
                            validationResult={invalidPropertiesMap['placeNameFi']}
                        />
                        <InputContainer
                            label='PAIKAN NIMI RUOTSIKSI'
                            disabled={isEditingDisabled}
                            value={stop.placeNameSw}
                            onChange={onChange('placeNameSw')}
                            validationResult={invalidPropertiesMap['placeNameSw']}
                        />
                    </div>
                    <div className={s.flexRow}>
                        <InputContainer
                            label='OSOITE'
                            disabled={isEditingDisabled}
                            value={stop.addressFi}
                            onChange={onChange('addressFi')}
                            validationResult={invalidPropertiesMap['addressFi']}
                        />
                        <InputContainer
                            label='OSOITE RUOTSIKSI'
                            disabled={isEditingDisabled}
                            value={stop.addressSw}
                            onChange={onChange('addressSw')}
                            validationResult={invalidPropertiesMap['addressSw']}
                        />
                    </div>
                    <div className={s.flexRow}>
                        <InputContainer
                            label='POSTINUMERO'
                            disabled={isEditingDisabled}
                            value={stop.postalNumber}
                            onChange={onChange('postalNumber')}
                            validationResult={invalidPropertiesMap['postalNumber']}
                        />
                        <Dropdown
                            onChange={onChange('municipality')}
                            items={this.props.codeListStore!.getDropdownItemList('Kunta (KELA)')}
                            selected={stop.municipality}
                            disabled={isEditingDisabled}
                            label='KUNTA'
                            validationResult={invalidPropertiesMap['municipality']}
                        />
                    </div>
                </div>
                <div className={s.formSection}>
                    <div className={s.sectionHeader}>Muu tiedot</div>
                    <div className={s.flexRow}>
                        <Dropdown
                            onChange={onChange('section')}
                            items={this.state.stopSections}
                            selected={stop.section}
                            emptyItem={{
                                value: '',
                                label: ''
                            }}
                            disabled={isEditingDisabled}
                            label='VYÖHYKE'
                            validationResult={invalidPropertiesMap['section']}
                        />
                        <InputContainer
                            label='HASTUS-PAIKKA'
                            disabled={isEditingDisabled}
                            value={stop.hastusId}
                            validationResult={invalidPropertiesMap['hastusId']}
                            onChange={onChange('hastusId')}
                        />
                    </div>
                    <div className={s.flexRow}>
                        <Dropdown
                            onChange={onChange('areaId')}
                            items={this.state.stopAreas}
                            selected={stop.areaId}
                            emptyItem={{
                                value: '',
                                label: ''
                            }}
                            disabled={isEditingDisabled}
                            label='PYSÄKKIALUE'
                            validationResult={invalidPropertiesMap['areaId']}
                        />
                        <Button
                            onClick={() => this.redirectToNewStopArea()}
                            disabled={isEditingDisabled}
                            type={ButtonType.SQUARE}
                            className={s.createNewStopAreaButton}
                        >
                            Luo uusi pysäkkialue
                        </Button>
                    </div>
                    <div className={s.flexRow}>
                        <InputContainer
                            label='LAITURI'
                            disabled={isEditingDisabled}
                            value={stop.platform}
                            onChange={onChange('platform')}
                            validationResult={invalidPropertiesMap['platform']}
                        />
                        <InputContainer
                            label='SÄDE (m)'
                            disabled={isEditingDisabled}
                            value={stop.radius}
                            type='number'
                            onChange={onChange('radius')}
                            validationResult={invalidPropertiesMap['radius']}
                        />
                    </div>
                    <div className={s.flexRow}>
                        <InputContainer
                            label='ELYNUMERO'
                            disabled={isEditingDisabled}
                            value={stop.elyNumber}
                            validationResult={invalidPropertiesMap['elyNumber']}
                            onChange={onChange('elyNumber')}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default StopForm;
