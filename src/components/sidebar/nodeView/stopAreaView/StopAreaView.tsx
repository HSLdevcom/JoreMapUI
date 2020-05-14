import { inject, observer } from 'mobx-react';
import React from 'react';
import { match } from 'react-router';
import { IDropdownItem } from '~/components/controls/Dropdown';
import SavePrompt, { ISaveModel } from '~/components/overlays/SavePrompt';
import SaveButton from '~/components/shared/SaveButton';
import Loader from '~/components/shared/loader/Loader';
import TransitType from '~/enums/transitType';
import StopAreaFactory from '~/factories/stopAreaFactory';
import { IStopArea } from '~/models';
import ITerminalArea from '~/models/ITerminalArea';
import navigator from '~/routing/navigator';
import QueryParams from '~/routing/queryParams';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import StopAreaService from '~/services/stopAreaService';
import { AlertStore } from '~/stores/alertStore';
import { CodeListStore } from '~/stores/codeListStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { ErrorStore } from '~/stores/errorStore';
import { MapStore } from '~/stores/mapStore';
import { NodeStore } from '~/stores/nodeStore';
import { StopAreaStore } from '~/stores/stopAreaStore';
import { Dropdown, TransitToggleButtonBar } from '../../../controls';
import InputContainer from '../../../controls/InputContainer';
import TextContainer from '../../../controls/TextContainer';
import SidebarHeader from '../../SidebarHeader';
import StopTable from './StopTable';
import * as s from './stopAreaView.scss';

interface IStopAreaViewProps {
    isNewStopArea: boolean;
    match?: match<any>;
    stopAreaStore?: StopAreaStore;
    nodeStore?: NodeStore;
    codeListStore?: CodeListStore;
    errorStore?: ErrorStore;
    alertStore?: AlertStore;
    confirmStore?: ConfirmStore;
    mapStore?: MapStore;
}

interface IStopAreaViewState {
    isLoading: boolean;
    terminalAreas: IDropdownItem[];
}

@inject(
    'stopAreaStore',
    'nodeStore',
    'errorStore',
    'alertStore',
    'codeListStore',
    'confirmStore',
    'mapStore'
)
@observer
class StopAreaView extends React.Component<IStopAreaViewProps, IStopAreaViewState> {
    private mounted: boolean;

    constructor(props: IStopAreaViewProps) {
        super(props);
        this.state = {
            isLoading: false,
            terminalAreas: [],
        };
        this.mounted = false;
    }

    async componentDidMount() {
        this.mounted = true;
        if (this.props.isNewStopArea) {
            await this.initNewStopArea();
        } else {
            await this.initExistingStopArea();
        }

        this.props.stopAreaStore!.setIsEditingDisabled(!this.props.isNewStopArea);
        const terminalAreas: ITerminalArea[] = await StopAreaService.fetchAllTerminalAreas();

        if (this.mounted) {
            this.setState({
                terminalAreas: this.createTerminalAreaDropdownItems(terminalAreas),
            });
        }
    }

    componentDidUpdate(prevProps: IStopAreaViewProps) {
        const params = this.props.match!.params.id;
        if (prevProps.match!.params.id !== params) {
            if (this.props.isNewStopArea) {
                this.initNewStopArea();
            } else {
                this.initExistingStopArea();
            }
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        this.props.stopAreaStore!.clear();
    }

    private initExistingStopArea = async () => {
        this.setState({ isLoading: true });

        const stopAreaId = this.props.match!.params.id;
        const stopArea = await StopAreaService.fetchStopArea(stopAreaId);
        if (!stopArea) {
            this.props.errorStore!.addError(
                `Haku löytää pysäkkialue (pysalueid ${stopAreaId}) ei onnistunut.`
            );
            const homeViewLink = routeBuilder.to(SubSites.home).toLink();
            navigator.goTo({ link: homeViewLink });
            return;
        }
        this.props.stopAreaStore!.activate({
            stopArea,
            isNewStopArea: false,
        });
        this.setState({ isLoading: false });
    };

    private initNewStopArea = async () => {
        this.setState({ isLoading: true });

        const stopArea = StopAreaFactory.createNewStopArea();
        this.props.stopAreaStore!.activate({
            stopArea,
            isNewStopArea: true,
        });

        this.setState({ isLoading: false });
    };

    private save = async () => {
        this.setState({ isLoading: true });
        try {
            if (this.props.isNewStopArea) {
                const stopAreaId = await StopAreaService.createStopArea(
                    this.props.stopAreaStore!.stopArea
                );
                const nodeQueryParam = navigator.getQueryParam(QueryParams.nodeId);
                const nodeId = nodeQueryParam ? nodeQueryParam[0] : undefined;
                const latLngQueryParam = navigator.getQueryParam(QueryParams.latLng);
                const latLng = latLngQueryParam ? latLngQueryParam[0] : undefined;
                if (latLng) {
                    const newNodeLink = routeBuilder
                        .to(SubSites.newNode)
                        .toTarget(':id', latLng)
                        .append(QueryParams.stopAreaId, stopAreaId)
                        .toLink();
                    navigator.goTo({ link: newNodeLink, shouldSkipUnsavedChangesPrompt: true });
                } else {
                    const nodeLink = routeBuilder
                        .to(SubSites.node)
                        .toTarget(':id', nodeId)
                        .append(QueryParams.stopAreaId, stopAreaId)
                        .toLink();
                    navigator.goTo({ link: nodeLink, shouldSkipUnsavedChangesPrompt: true });
                }
            } else {
                await StopAreaService.updateStopArea(this.props.stopAreaStore!.stopArea);
                this.props.stopAreaStore!.setIsEditingDisabled(true);
                this.initExistingStopArea();
            }
            await this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
        }
    };

    private showSavePrompt = () => {
        const confirmStore = this.props.confirmStore!;
        const stopAreaStore = this.props.stopAreaStore!;
        const currentStopArea = stopAreaStore.stopArea;
        const oldStopArea = stopAreaStore.oldStopArea;
        const oldRoute = stopAreaStore.oldStopArea;
        const stopItems = stopAreaStore.stopItems;

        const shouldShowNotification =
            stopItems.length > 0 &&
            (currentStopArea.nameFi !== oldStopArea.nameFi ||
                currentStopArea.nameSw !== oldStopArea.nameSw);
        const confirmNotification = shouldShowNotification
            ? `Huom. nimimuutokset muuttavat kaikkien pysäkkialueeseen kuuluvien pysäkkien ( ${stopItems
                  .map((stopItem) => stopItem.nodeId)
                  .join(', ')
                  .toString()} ) nimet.`
            : undefined;

        const saveModel: ISaveModel = {
            type: 'saveModel',
            newData: currentStopArea,
            oldData: oldRoute,
            model: 'stopArea',
        };
        confirmStore.openConfirm({
            confirmNotification,
            content: <SavePrompt models={[saveModel]} />,
            onConfirm: () => {
                this.save();
            },
        });
    };

    private createTerminalAreaDropdownItems = (terminalAreas: ITerminalArea[]): IDropdownItem[] => {
        return terminalAreas.map((terminalArea: ITerminalArea) => {
            const item: IDropdownItem = {
                value: `${terminalArea.id}`,
                label: `${terminalArea.name}`,
            };
            return item;
        });
    };

    private selectTransitType = (transitType: TransitType) => {
        this.props.stopAreaStore!.updateStopAreaProperty('transitType', transitType);
    };

    private onChangeStopAreaProperty = (property: keyof IStopArea) => (value: any) => {
        this.props.stopAreaStore!.updateStopAreaProperty(property, value);
    };

    render() {
        const stopAreaStore = this.props.stopAreaStore!;
        const stopArea = stopAreaStore.stopArea;
        const invalidPropertiesMap = stopAreaStore.invalidPropertiesMap;
        if (this.state.isLoading) {
            return (
                <div className={s.stopAreaView}>
                    <Loader />
                </div>
            );
        }
        if (!stopArea) return null;

        const isEditingDisabled = stopAreaStore.isEditingDisabled;
        const transitType = stopAreaStore.stopArea.transitType;

        const isSaveButtonDisabled =
            !transitType ||
            isEditingDisabled ||
            !stopAreaStore.isDirty ||
            !stopAreaStore.isFormValid;
        const selectedTransitTypes = stopArea!.transitType ? [stopArea!.transitType!] : [];

        let transitTypeError;
        if (!transitType) {
            transitTypeError = 'Verkon tyyppi täytyy valita.';
        }
        return (
            <div className={s.stopAreaView}>
                <div className={s.content}>
                    <SidebarHeader
                        isEditButtonVisible={!this.props.isNewStopArea}
                        isEditing={!isEditingDisabled}
                        isBackButtonVisible={true}
                        isCloseButtonVisible={true}
                        onEditButtonClick={stopAreaStore.toggleIsEditingDisabled}
                    >
                        {this.props.isNewStopArea ? 'Luo uusi pysäkkialue' : 'Pysäkkialue'}
                    </SidebarHeader>
                    <div className={s.form}>
                        <div className={s.formSection}>
                            <div className={s.flexRow}>
                                <div className={s.formItem}>
                                    <div className={s.inputLabel}>VERKKO</div>
                                    <TransitToggleButtonBar
                                        selectedTransitTypes={selectedTransitTypes}
                                        toggleSelectedTransitType={this.selectTransitType}
                                        disabled={isEditingDisabled}
                                        errorMessage={transitTypeError}
                                    />
                                </div>
                            </div>
                            <div className={s.flexRow}>
                                <InputContainer
                                    label='NIMI'
                                    disabled={isEditingDisabled}
                                    value={stopArea.nameFi}
                                    validationResult={invalidPropertiesMap['nameFi']}
                                    onChange={this.onChangeStopAreaProperty('nameFi')}
                                />
                                <InputContainer
                                    label='NIMI RUOTSIKSI'
                                    disabled={isEditingDisabled}
                                    value={stopArea.nameSw}
                                    validationResult={invalidPropertiesMap['nameSw']}
                                    onChange={this.onChangeStopAreaProperty('nameSw')}
                                />
                            </div>

                            <div className={s.flexRow}>
                                <Dropdown
                                    onChange={this.onChangeStopAreaProperty('stopAreaGroupId')}
                                    validationResult={invalidPropertiesMap['stopAreaGroupId']}
                                    disabled={isEditingDisabled || !this.props.isNewStopArea}
                                    items={this.props.codeListStore!.getDropdownItemList(
                                        'Pysäkkialueid'
                                    )}
                                    selected={stopArea.stopAreaGroupId}
                                    label='PYSÄKKIALUE RYHMÄ'
                                />
                                <Dropdown
                                    onChange={this.onChangeStopAreaProperty('terminalAreaId')}
                                    items={this.state.terminalAreas}
                                    selected={stopArea.terminalAreaId}
                                    emptyItem={{
                                        value: undefined,
                                        label: '',
                                    }}
                                    disabled={isEditingDisabled}
                                    label='TERMINAALIALUE'
                                    validationResult={invalidPropertiesMap['terminalAreaId']}
                                />
                            </div>
                            {!this.props.isNewStopArea && (
                                <div className={s.flexRow}>
                                    <TextContainer label='MUOKANNUT' value={stopArea.modifiedBy} />
                                    <TextContainer
                                        label='MUOKATTU PVM'
                                        isTimeIncluded={true}
                                        value={stopArea.modifiedOn}
                                    />
                                </div>
                            )}
                        </div>
                        {!this.props.isNewStopArea && (
                            <div className={s.formSection}>
                                <StopTable stopArea={stopArea} />
                            </div>
                        )}
                    </div>
                </div>
                <SaveButton
                    onClick={() => this.showSavePrompt()}
                    disabled={isSaveButtonDisabled}
                    savePreventedNotification={''}
                >
                    {this.props.isNewStopArea ? 'Luo uusi pysäkkialue' : 'Tallenna muutokset'}
                </SaveButton>
            </div>
        );
    }
}
export default StopAreaView;
