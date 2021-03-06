import classnames from 'classnames';
import * as L from 'leaflet';
import { inject, observer } from 'mobx-react';
import React, { useEffect, useRef } from 'react';
import { FaAngleDown, FaAngleRight } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import { Button } from '~/components/controls';
import ButtonType from '~/enums/buttonType';
import ToolbarToolType from '~/enums/toolbarToolType';
import EventListener, { IRoutePathLinkClickParams } from '~/helpers/EventListener';
import IRoutePathLink from '~/models/IRoutePathLink';
import routeBuilder from '~/routing/routeBuilder';
import SubSites from '~/routing/subSites';
import { CodeListStore } from '~/stores/codeListStore';
import { MapStore } from '~/stores/mapStore';
import { RoutePathLayerStore } from '~/stores/routePathLayerStore';
import { RoutePathStore } from '~/stores/routePathStore';
import { ToolbarStore } from '~/stores/toolbarStore';
import TextContainer from '../../../controls/TextContainer';
import * as s from './routePathListItem.scss';

interface IRoutePathListLinkProps {
    isExtended: boolean;
    isHovered: boolean;
    routePathLink: IRoutePathLink;
    routePathStore?: RoutePathStore;
    routePathLayerStore?: RoutePathLayerStore;
    codeListStore?: CodeListStore;
    mapStore?: MapStore;
    toolbarStore?: ToolbarStore;
}

const ROUTE_PATH_TOOLS = [
    ToolbarToolType.ExtendRoutePath,
    ToolbarToolType.RemoveRoutePathLink,
    ToolbarToolType.CopyRoutePathSegment,
];

const RoutePathListLink = inject(
    'routePathStore',
    'routePathLayerStore',
    'codeListStore',
    'mapStore',
    'toolbarStore'
)(
    observer(
        React.forwardRef((props: IRoutePathListLinkProps, ref: React.RefObject<HTMLDivElement>) => {
            const isExtendedRef = useRef(props.isExtended);
            isExtendedRef.current = props.isExtended;
            useEffect(() => {
                EventListener.on('routePathLinkClick', onRoutePathLinkClick);
                return () => {
                    EventListener.off('routePathLinkClick', onRoutePathLinkClick);
                };
            }, []);
            const renderHeader = () => {
                const id = props.routePathLink.id;
                const orderNumber = props.routePathLink.orderNumber;
                const isExtended = props.routePathLayerStore!.extendedListItemId === id;
                return (
                    <div className={s.itemHeader}>
                        <div
                            className={s.headerContent}
                            onClick={onClickLinkItem}
                            onMouseEnter={onMouseEnterLinkItem}
                            onMouseLeave={onMouseLeaveLinkItem}
                            data-cy='itemHeader'
                        >
                            <div className={s.headerContainer}>Reitinlinkki {orderNumber}</div>
                        </div>
                        <div className={s.itemToggle} onClick={toggleExtendedListItem}>
                            {isExtended && <FaAngleDown />}
                            {!isExtended && <FaAngleRight />}
                        </div>
                    </div>
                );
            };

            const onClickLinkItem = () => {
                const clickParams: IRoutePathLinkClickParams = {
                    routePathLinkId: props.routePathLink.id,
                };
                EventListener.trigger('routePathLinkClick', clickParams);
            };

            const onRoutePathLinkClick = (clickEvent: CustomEvent) => {
                const selectedTool = props.toolbarStore!.selectedTool;
                // Action depends on whether a routePathTool is selected or not
                if (selectedTool && ROUTE_PATH_TOOLS.includes(selectedTool.toolType)) {
                    return;
                }
                const clickParams: IRoutePathLinkClickParams = clickEvent.detail;
                if (clickParams.routePathLinkId !== props.routePathLink.id) {
                    return;
                }

                toggleExtendedListItem();
            };

            const toggleExtendedListItem = () => {
                const currentListItemId = props.routePathLink.id;
                const routePathLayerStore = props.routePathLayerStore;
                const isExtended = isExtendedRef.current;
                if (isExtended) {
                    routePathLayerStore!.setExtendedListItemId(null);
                } else {
                    routePathLayerStore!.setExtendedListItemId(currentListItemId);
                    props.mapStore!.setMapBounds(getBounds());
                }
            };

            const getBounds = () => {
                const geometry = props.routePathStore!.getLinkGeom(props.routePathLink.id);
                const bounds: L.LatLngBounds = new L.LatLngBounds([]);
                geometry.forEach((geom: L.LatLng) => bounds.extend(geom));
                return bounds;
            };

            const renderBody = () => {
                return (
                    <>
                        {renderRoutePathLinkView(props.routePathLink)}
                        <div className={s.footer}>
                            <Button onClick={() => openLinkInNewTab()} type={ButtonType.SQUARE}>
                                Avaa linkki
                                <FiExternalLink />
                            </Button>
                        </div>
                    </>
                );
            };

            const openLinkInNewTab = () => {
                const routeLink = props.routePathLink;
                const linkViewLink = routeBuilder
                    .to(SubSites.link)
                    .toTarget(
                        ':id',
                        [routeLink.startNode.id, routeLink.endNode.id, routeLink.transitType].join(
                            ','
                        )
                    )
                    .toLink();
                window.open(linkViewLink, '_blank');
            };

            const renderRoutePathLinkView = (rpLink: IRoutePathLink) => {
                return (
                    <div>
                        <div className={s.flexRow}>
                            <TextContainer label='ALKUSOLMU' value={rpLink.startNode.id} />
                            <TextContainer label='LOPPUSOLMU' value={rpLink.endNode.id} />
                        </div>
                        <div className={s.flexRow}>
                            <TextContainer
                                label='JÄRJESTYSNUMERO'
                                value={rpLink.orderNumber.toString()}
                            />
                        </div>
                    </div>
                );
            };

            const onMouseEnterLinkItem = () => {
                props.routePathLayerStore!.setHoveredItemId(props.routePathLink.id);
            };

            const onMouseLeaveLinkItem = () => {
                if (props.isHovered) {
                    props.routePathLayerStore!.setHoveredItemId(null);
                }
            };

            const isExtended = props.isExtended;
            const isHovered = props.isHovered;
            return (
                <div ref={ref} className={classnames(s.routePathListItem)}>
                    <div
                        className={s.listIconWrapper}
                        onMouseEnter={onMouseEnterLinkItem}
                        onMouseLeave={onMouseLeaveLinkItem}
                        onClick={onClickLinkItem}
                    >
                        <div
                            className={classnames(
                                s.borderContainer,
                                isHovered
                                    ? s.hoveredIconHighlight
                                    : isExtended
                                    ? s.extendedIconHighlight
                                    : undefined
                            )}
                            data-cy='rpListLink'
                        >
                            <div className={s.borderLeft} />
                            <div />
                        </div>
                    </div>
                    <div className={s.contentWrapper}>
                        {renderHeader()}
                        {isExtended && <div className={s.itemContent}>{renderBody()}</div>}
                    </div>
                </div>
            );
        })
    )
);

export default RoutePathListLink;
