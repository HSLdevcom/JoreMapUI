import { inject, observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import { FiXCircle } from 'react-icons/fi';
import TransitTypeLinks from '~/components/shared/TransitTypeLinks';
import TransitType from '~/enums/transitType';
import LineService from '~/services/lineService';
import { toDateString } from '~/utils/dateUtils';
import { IRoutePathSelection, RoutePathSelection } from './RoutePathComparisonView';
import * as s from './routePathTabs.scss';

interface IRoutePathTabProps {
    routePath: IRoutePathSelection;
    deselectRoutePath: () => void;
}

const RoutePathTab = inject()(
    observer((props: IRoutePathTabProps) => {
        const routePath = props.routePath;
        const [transitType, setTransitType] = useState<TransitType | null>(null);

        useEffect(() => {
            const fetchTransitType = async () => {
                const line = await LineService.fetchLine(routePath.lineId);
                setTransitType(line.transitType!);
            };
            if (routePath.lineId) {
                fetchTransitType();
            }
        }, [routePath.lineId]);

        if (!routePath.startDate) {
            return <div className={s.routePathTabWrapper}>Ei valittua reitinsuuntaa.</div>;
        }

        return (
            <div className={s.routePathTabWrapper}>
                <div className={s.transitTypeLinks}>
                    {transitType && (
                        <TransitTypeLinks
                            lineId={routePath.lineId}
                            routeId={routePath.routeId}
                            transitType={transitType}
                            size={'medium'}
                        />
                    )}
                    <div
                        className={s.deselectRoutePathButton}
                        title={'Poista valinta'}
                        onClick={props.deselectRoutePath}
                    >
                        <FiXCircle />
                    </div>
                </div>
                <div className={s.routePathInfo}>
                    Suunta {routePath.direction} {toDateString(routePath.startDate)}
                </div>
            </div>
        );
    })
);

interface ISelectedRoutePathTabsProps {
    routePathSelection1: IRoutePathSelection;
    routePathSelection2: IRoutePathSelection;
    deselectRoutePath: (routePathSelection: RoutePathSelection) => void;
}

const RoutePathTabs = inject()(
    observer((props: ISelectedRoutePathTabsProps) => {
        return (
            <div className={s.selectedRoutePathTabs}>
                <RoutePathTab
                    routePath={props.routePathSelection1}
                    deselectRoutePath={() =>
                        props.deselectRoutePath(RoutePathSelection.ROUTEPATH_1)
                    }
                />
                <RoutePathTab
                    routePath={props.routePathSelection2}
                    deselectRoutePath={() =>
                        props.deselectRoutePath(RoutePathSelection.ROUTEPATH_2)
                    }
                />
            </div>
        );
    })
);

export default RoutePathTabs;
