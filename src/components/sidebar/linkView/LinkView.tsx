import L from 'leaflet';
import { inject, observer } from 'mobx-react';
import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { RouteComponentProps } from 'react-router-dom';
import SavePrompt, { ISaveModel } from '~/components/overlays/SavePrompt';
import RoutePathList from '~/components/shared/RoutePathList';
import SaveButton from '~/components/shared/SaveButton';
import Loader from '~/components/shared/loader/Loader';
import ButtonType from '~/enums/buttonType';
import TransitType from '~/enums/transitType';
import LinkFactory from '~/factories/linkFactory';
import EventHelper from '~/helpers/EventHelper';
import { ILink, INode } from '~/models';
import IRoutePath from '~/models/IRoutePath';
import navigator from '~/routing/navigator';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import LinkService from '~/services/linkService';
import NodeService from '~/services/nodeService';
import RoutePathService from '~/services/routePathService';
import { AlertStore } from '~/stores/alertStore';
import { CodeListStore } from '~/stores/codeListStore';
import { ConfirmStore } from '~/stores/confirmStore';
import { ErrorStore } from '~/stores/errorStore';
import { LinkStore } from '~/stores/linkStore';
import { MapStore } from '~/stores/mapStore';
import NavigationUtils from '~/utils/NavigationUtils';
import { Button, TransitToggleButtonBar } from '../../controls';
import InputContainer from '../../controls/InputContainer';
import TextContainer from '../../controls/TextContainer';
import SidebarHeader from '../SidebarHeader';
import * as s from './linkView.scss';

interface ILinkViewProps extends RouteComponentProps<any> {
    isNewLink: boolean;
    codeListStore?: CodeListStore;
    errorStore?: ErrorStore;
    linkStore?: LinkStore;
    mapStore?: MapStore;
    alertStore?: AlertStore;
    confirmStore?: ConfirmStore;
}

interface ILinkViewState {
    isLoading: boolean;
    routePathsUsingLink: IRoutePath[];
}

@inject('linkStore', 'mapStore', 'errorStore', 'alertStore', 'codeListStore', 'confirmStore')
@observer
class LinkView extends React.Component<ILinkViewProps, ILinkViewState> {
    private existingTransitTypes: TransitType[] = [];

    constructor(props: ILinkViewProps) {
        super(props);
        this.state = {
            isLoading: false,
            routePathsUsingLink: [],
        };
    }

    async componentDidMount() {
        if (this.props.isNewLink) {
            await this.initNewLink();
        } else {
            await this.initExistingLink();
        }
        this.props.linkStore!.setIsEditingDisabled(!this.props.isNewLink);
        EventHelper.on('geometryChange', () => this.props.linkStore!.setIsEditingDisabled(false));
    }

    async componentDidUpdate(prevProps: ILinkViewProps) {
        if (this.props.location.pathname !== prevProps.location.pathname) {
            if (this.props.isNewLink) {
                await this.initNewLink();
            } else {
                await this.initExistingLink();
            }
        }
    }

    componentWillUnmount() {
        this.props.linkStore!.clear();
        EventHelper.off('geometryChange', () => this.props.linkStore!.setIsEditingDisabled(false));
    }

    private initExistingLink = async () => {
        this.setState({ isLoading: true });
        this.props.linkStore!.clear();

        const [startNodeId, endNodeId, transitTypeCode] = this.props.match!.params.id.split(',');
        if (startNodeId && endNodeId && transitTypeCode) {
            const link = await LinkService.fetchLink(startNodeId, endNodeId, transitTypeCode);
            if (!link) {
                this.props.errorStore!.addError(
                    `Haku löytää linkki (alkusolmu ${startNodeId}, loppusolmu ${endNodeId}, verkko ${transitTypeCode}) ei onnistunut.`
                );
                const homeViewLink = routeBuilder.to(SubSites.home).toLink();
                navigator.goTo({ link: homeViewLink });
                return;
            }
            this.centerMapToLink(link);
            this.props.linkStore!.activate({
                link,
                nodes: [link.startNode, link.endNode],
                isNewLink: false,
            });
            this.props.linkStore!.setIsLinkGeometryEditable(true);
            const bounds = L.latLngBounds(link.geometry);
            this.props.mapStore!.setMapBounds(bounds);

            const routePaths = await RoutePathService.fetchRoutePathsUsingLink(
                link.startNode.id,
                link.endNode.id,
                link.transitType!
            );
            this.setState({ routePathsUsingLink: routePaths });
        }
        this.setState({ isLoading: false });
    };

    private initNewLink = async () => {
        this.setState({ isLoading: true });
        this.props.linkStore!.clear();

        const [startNodeId, endNodeId] = this.props.match!.params.id.split(',');
        try {
            const startNode = await NodeService.fetchNode(startNodeId);
            const endNode = await NodeService.fetchNode(endNodeId);
            this.createNewLink(startNode!, endNode!);
        } catch (ex) {
            this.props.errorStore!.addError(
                `Alkusolmun ${startNodeId} tai loppusolmun ${endNodeId} haku epäonnistui`
            );
            return;
        }

        const link = this.props.linkStore!.link;
        const existingLinks = await LinkService.fetchLinks(link.startNode.id, link.endNode.id);
        if (existingLinks.length > 0) {
            this.existingTransitTypes = existingLinks.map((link) => link.transitType!);
        }

        this.setState({ isLoading: false });
    };

    private createNewLink = (startNode: INode, endNode: INode) => {
        const link = LinkFactory.createNewLink(startNode, endNode);
        this.centerMapToLink(link);
        this.props.linkStore!.activate({ link, nodes: [startNode, endNode], isNewLink: true });
    };

    private centerMapToLink = (link: ILink) => {
        const bounds = L.latLngBounds(link.geometry);
        this.props.mapStore!.setMapBounds(bounds);
    };

    private save = async () => {
        this.setState({ isLoading: true });
        try {
            if (this.props.isNewLink) {
                await LinkService.createLink(this.props.linkStore!.link);
                this.navigateToCreatedLink();
            } else {
                await LinkService.updateLink(this.props.linkStore!.link);
                this.props.linkStore!.setOldLink(this.props.linkStore!.link);
                this.props.linkStore!.setIsEditingDisabled(true);
                this.initExistingLink();
            }
            await this.props.alertStore!.setFadeMessage({ message: 'Tallennettu!' });
        } catch (e) {
            this.props.errorStore!.addError(`Tallennus epäonnistui`, e);
        }
    };

    private showSavePrompt = () => {
        const confirmStore = this.props.confirmStore;
        const currentLink = this.props.linkStore!.link;
        const oldLink = this.props.linkStore!.oldLink;
        const saveModel: ISaveModel = {
            type: 'saveModel',
            newData: currentLink,
            oldData: oldLink,
            model: 'link',
        };
        confirmStore!.openConfirm({
            content: <SavePrompt models={[saveModel]} />,
            onConfirm: () => {
                this.save();
            },
        });
    };

    private navigateToCreatedLink = () => {
        const link = this.props.linkStore!.link;
        const linkViewLink = routeBuilder
            .to(SubSites.link)
            .toTarget(':id', [link.startNode.id, link.endNode.id, link.transitType].join(','))
            .toLink();
        navigator.goTo({ link: linkViewLink, shouldSkipUnsavedChangesPrompt: true });
    };

    private selectTransitType = (transitType: TransitType) => {
        this.props.linkStore!.updateLinkProperty('transitType', transitType);
    };

    private transitTypeAlreadyExists = (transitType: TransitType) => {
        if (!this.props.isNewLink) return false;

        return this.existingTransitTypes.includes(transitType);
    };

    private onChangeLinkProperty = (property: keyof ILink) => (value: any) => {
        this.props.linkStore!.updateLinkProperty(property, value);
    };

    render() {
        const link = this.props.linkStore!.link;
        if (this.state.isLoading) {
            return (
                <div className={s.linkView}>
                    <Loader />
                </div>
            );
        }
        // TODO: show some indicator to user of an empty page
        if (!link) {
            return <div className={s.linkView}>Linkkiä ei löytynyt.</div>;
        }

        const invalidPropertiesMap = this.props.linkStore!.invalidPropertiesMap;
        const isEditingDisabled = this.props.linkStore!.isEditingDisabled;
        const startNode = link!.startNode;
        const endNode = link!.endNode;

        const transitType = this.props.linkStore!.link.transitType;

        const isSaveButtonDisabled =
            !transitType ||
            isEditingDisabled ||
            !this.props.linkStore!.isDirty ||
            (this.props.isNewLink && this.transitTypeAlreadyExists(transitType)) ||
            !this.props.linkStore!.isFormValid;
        const selectedTransitTypes = link!.transitType ? [link!.transitType!] : [];

        let transitTypeError;
        if (!transitType) {
            transitTypeError = 'Verkon tyyppi täytyy valita.';
        } else if (transitType && this.transitTypeAlreadyExists(transitType)) {
            transitTypeError = 'Linkki on jo olemassa (sama alkusolmu, loppusolmu ja verkko).';
        }

        return (
            <div className={s.linkView} data-cy='linkView'>
                <div className={s.content}>
                    <SidebarHeader
                        isEditButtonVisible={!this.props.isNewLink}
                        isEditing={!isEditingDisabled}
                        onEditButtonClick={this.props.linkStore!.toggleIsEditingDisabled}
                        isCloseButtonVisible={true}
                    >
                        Linkki
                    </SidebarHeader>
                    <div className={s.formSection}>
                        <div className={s.flexRow}>
                            <div className={s.formItem}>
                                <div className={s.inputLabel}>VERKKO</div>
                                <TransitToggleButtonBar
                                    selectedTransitTypes={selectedTransitTypes}
                                    toggleSelectedTransitType={this.selectTransitType}
                                    disabled={!this.props.isNewLink}
                                    errorMessage={transitTypeError}
                                />
                            </div>
                        </div>
                        <div className={s.flexRow}>
                            <TextContainer
                                label='ALKUSOLMU'
                                value={startNode ? startNode.id : '-'}
                            />
                            <TextContainer
                                label='TYYPPI'
                                value={this.props.codeListStore!.getCodeListLabel(
                                    'Solmutyyppi (P/E)',
                                    startNode.type
                                )}
                            />
                            <TextContainer
                                label='NIMI'
                                value={startNode && startNode.stop ? startNode.stop!.nameFi : '-'}
                            />
                        </div>
                        <div className={s.flexRow}>
                            <TextContainer label='LOPPUSOLMU' value={endNode ? endNode.id : '-'} />
                            <TextContainer
                                label='TYYPPI'
                                value={this.props.codeListStore!.getCodeListLabel(
                                    'Solmutyyppi (P/E)',
                                    endNode.type
                                )}
                            />
                            <TextContainer
                                label='NIMI'
                                value={endNode && endNode.stop ? endNode.stop!.nameFi : '-'}
                            />
                        </div>
                        <div className={s.flexRow}>
                            <InputContainer
                                label='MITATTU PITUUS (m)'
                                disabled={isEditingDisabled}
                                value={link.measuredLength}
                                type='number'
                                validationResult={invalidPropertiesMap['measuredLength']}
                                onChange={this.onChangeLinkProperty('measuredLength')}
                                data-cy='measuredLength'
                            />
                            <InputContainer
                                label='LASKETTU PITUUS (m)'
                                disabled={true}
                                value={link.length}
                                validationResult={invalidPropertiesMap['length']}
                            />
                        </div>
                        <div className={s.flexRow}>
                            <InputContainer
                                label='AJONOPEUS (km/h)'
                                disabled={isEditingDisabled}
                                value={link.speed}
                                type='number'
                                validationResult={invalidPropertiesMap['speed']}
                                onChange={this.onChangeLinkProperty('speed')}
                            />
                        </div>
                        {!this.props.isNewLink && (
                            <div className={s.flexRow}>
                                <TextContainer label='MUOKANNUT' value={link.modifiedBy} />
                                <TextContainer
                                    label='MUOKATTU PVM'
                                    isTimeIncluded={true}
                                    value={link.modifiedOn}
                                />
                            </div>
                        )}
                    </div>
                    {!this.props.isNewLink && (
                        <RoutePathList
                            className={s.routePathSegmentList}
                            topic={'Linkkiä käyttävät reitinsuunnat'}
                            routePaths={this.state.routePathsUsingLink}
                        />
                    )}
                </div>
                <div className={s.buttonBar}>
                    <Button
                        onClick={() => NavigationUtils.openNodeView({ nodeId: link.startNode.id })}
                        type={ButtonType.SQUARE}
                    >
                        <div className={s.buttonContent}>
                            <FiChevronLeft className={s.startNodeButton} />
                            <div className={s.contentText}>
                                Alkusolmu
                                <p>{startNode.id}</p>
                            </div>
                        </div>
                    </Button>
                    <Button
                        onClick={() => NavigationUtils.openNodeView({ nodeId: link.endNode.id })}
                        type={ButtonType.SQUARE}
                    >
                        <div className={s.buttonContent}>
                            <div className={s.contentText}>
                                Loppusolmu
                                <p>{endNode.id}</p>
                            </div>
                            <FiChevronRight className={s.endNodeButton} />
                        </div>
                    </Button>
                </div>
                <SaveButton
                    onClick={() => (this.props.isNewLink ? this.save() : this.showSavePrompt())}
                    disabled={isSaveButtonDisabled}
                    savePreventedNotification={''}
                >
                    {this.props.isNewLink ? 'Luo uusi linkki' : 'Tallenna muutokset'}
                </SaveButton>
            </div>
        );
    }
}
export default LinkView;
